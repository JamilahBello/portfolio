const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true, min: 0 },
            total: {
                type: Number,
                required: true,
                default: function () {
                    return this.price * this.quantity;
                },
            },
        },
    ],
    status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending",
    },
    shippingAddress: {
        type: {
            street: String,
            city: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
            state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
        },
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ["credit_card", "paypal", "bank_transfer"],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ["paid", "unpaid"],
        default: "unpaid",
    },
    trackingNumber: { type: String, default: null },
    totalAmount: { type: Number, required: true, min: 0, default: function() { return this.products.reduce((acc, item) => acc + item.total, 0); } },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
});

// Pre-save middleware to update timestamps
OrderSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

OrderSchema.methods.createTrackingNumber = function () {
    return `TRACK-${this._id}-${Date.now()}`;
};

OrderSchema.methods.findByIdAndUpdate = function (id, updates) {
    return this.model("Order").findByIdAndUpdate(id, updates, { new: true });
};

OrderSchema.methods.findByTrackingNumber = function (trackingNumber) {
    return this.model("Order").findOne({ trackingNumber });
};

// Virtual
OrderSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

OrderSchema.statics.findDeleted = function (query) {
    return this.find({ ...query, deletedAt: { $ne: null } });
};

// Static method to find non-deleted orders
OrderSchema.statics.findNonDeleted = function () {
    return this.find({ deletedAt: null });
};

OrderSchema.methods.softDelete = async function () {
    if (!this.deletedAt) {
      this.deletedAt = new Date();
      await this.save();
    }
    return this;
};

// Static method to restore a soft-deleted order
OrderSchema.statics.restore = function (orderId) {
    return this.findByIdAndUpdate(orderId, { deletedAt: null }, { new: true });
};

// Method to get order details
OrderSchema.methods.getDetails = function () {
    return {
        id: this._id,
        userId: this.userId,
        products: this.products,
        status: this.status,
        shippingAddress: this.shippingAddress,
        paymentMethod: this.paymentMethod,
        paymentStatus: this.paymentStatus,
        trackingNumber: this.trackingNumber,
        totalAmount: this.totalAmount,
        deliveryFee: this.deliveryFee,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt,
    };
};

// Add timestamps for createdAt and updatedAt
OrderSchema.set("timestamps", true);

module.exports = mongoose.model("Order", OrderSchema);
