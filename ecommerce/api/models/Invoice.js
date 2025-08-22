const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    totalAmount: { type: Number, required: true, default: function() {  
        return this.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    }},
    status: { type: String, enum: ['paid', 'unpaid', 'overdue'], default: 'unpaid' },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        total: { type: Number, required: true, default: function() {
            return this.quantity * this.price;
        }}
    }],
    proofOfPayment: { type: String, default: null }, // URL or path to the proof of payment
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null }
});

// Pre-save middleware to update timestamps
InvoiceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to check if the invoice is deleted
InvoiceSchema.methods.isDeleted = function() {
    return this.deletedAt !== null;
};

// Static method to find non-deleted invoices
InvoiceSchema.statics.findNonDeleted = function() {
    return this.find({ deletedAt: null });
};

// Static method find all deleted invoices by orderId
InvoiceSchema.methods.findDeletedByOrderId = function(orderId) {
    return this.find({ orderId: orderId, deletedAt: { $ne: null } });
};

// Static method to soft delete an invoice
InvoiceSchema.statics.softDelete = function(invoiceId) {
    return this.findByIdAndUpdate(invoiceId, { deletedAt: Date.now() }, { new: true });
};

// Static method to restore a soft-deleted invoice
InvoiceSchema.statics.restore = function(invoiceId) {
    return this.findByIdAndUpdate(invoiceId, { deletedAt: null }, { new: true });
};

InvoiceSchema.methods.createInvoiceNumber = function() {
    return `INV-${this._id}-${Date.now()}`;
};

// Method to get invoice details
InvoiceSchema.methods.getDetails = function() {
    return {
        id: this._id,
        userId: this.userId,
        orderId: this.orderId,
        invoiceNumber: this.invoiceNumber,
        totalAmount: this.totalAmount,
        status: this.status,
        products: this.products,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt
    };
};

// Ensure the schema is indexed for better performance
InvoiceSchema.index({ invoiceNumber: 1 });

// Add timestamps for createdAt and updatedAt
InvoiceSchema.set('timestamps', true);

module.exports = mongoose.model('Invoice', InvoiceSchema);
