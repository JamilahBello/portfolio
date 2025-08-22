const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    shippingAddress: { type: String, required: true },
    paymentMethod: { type: String, enum: ['credit_card', 'paypal', 'bank_transfer'], required: true },
    paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
    trackingNumber: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null }
});

// Pre-save middleware to update timestamps
OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

OrderSchema.methods.createTrackingNumber = function() {
    return `TRACK-${this._id}-${Date.now()}`;
}

OrderSchema.methods.findByIdAndUpdate = function(id, updates) {
    return this.model('Order').findByIdAndUpdate(id, updates, { new: true });
};

OrderSchema.methods.findByTrackingNumber = function(trackingNumber) {
    return this.model('Order').findOne({ trackingNumber });
};

OrderSchema.methods.findDeletedByUserId = function(userId) {
    return this.model('Order').find({ userId: userId, deletedAt: { $ne: null } });
};

// Method to check if the order is deleted
OrderSchema.methods.isDeleted = function() {
    return this.deletedAt !== null;
};

// Static method to find non-deleted orders
OrderSchema.statics.findNonDeleted = function() {
    return this.find({ deletedAt: null });
}

// Static method to soft delete an order
OrderSchema.statics.softDelete = function(orderId) {
    return this.findByIdAndUpdate(orderId, { deletedAt: Date.now() }, { new: true });
};

// Static method to restore a soft-deleted order
OrderSchema.statics.restore = function(orderId) {
    return this.findByIdAndUpdate(orderId, { deletedAt: null }, { new: true });
}

// Method to get order details
OrderSchema.methods.getDetails = function() {
    return {
        id: this._id,
        userId: this.userId,
        products: this.products,
        status: this.status,
        shippingAddress: this.shippingAddress,
        paymentMethod: this.paymentMethod,
        paymentStatus: this.paymentStatus,
        trackingNumber: this.trackingNumber,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt
    };
}

OrderSchema.virtual('totalAmount').get(function() {
    const Product = mongoose.model('Product');
    return this.products.reduce((total, product) => {
        const productDetails = Product.findById(product.productId);
        return total + (productDetails.price * product.quantity);
    }, 0);
});

// Ensure the schema is indexed for better performance
OrderSchema.index({ userId: 1, status: 1 });

// Add timestamps for createdAt and updatedAt
OrderSchema.set('timestamps', true);

module.exports = mongoose.model('Order', OrderSchema);
