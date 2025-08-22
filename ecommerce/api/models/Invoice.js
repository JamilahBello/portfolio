const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    invoiceNumber: { type: String, required: true, unique: true },
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ["paid", "unpaid", "overdue"],
        default: "unpaid",
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true },
            total: {
                type: Number,
                required: true,
                default: function () {
                    return this.quantity * this.price;
                },
            },
        },
    ],
    proofOfPayment: { type: String, default: null }, // URL or path to the proof of payment
    discountAmount: { type: Number, required: true, default: 0 },
    discountReason: { type: String, enum: ["Discount applied", "Promotional offer"], default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
});

// Pre-save middleware to update timestamps
InvoiceSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find non-deleted invoices
InvoiceSchema.statics.findNonDeleted = function () {
    return this.find({ deletedAt: null });
};

InvoiceSchema.statics.findDeleted = function (query) {
    return this.find({ ...query, deletedAt: { $ne: null } });
};

InvoiceSchema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
});

InvoiceSchema.methods.softDelete = async function () {
    if (!this.deletedAt) {
      this.deletedAt = new Date();
      await this.save();
    }
    return this;
};

// Static method to restore a soft-deleted invoice
InvoiceSchema.statics.restore = function (invoiceId) {
    return this.findByIdAndUpdate(
        invoiceId,
        { deletedAt: null },
        { new: true },
    );
};

InvoiceSchema.methods.createInvoiceNumber = function () {
    return `INV-${this._id}-${Date.now()}`;
};

// Method to get invoice details
InvoiceSchema.methods.getDetails = function () {
    return {
        id: this._id,
        userId: this.userId,
        orderId: this.orderId,
        invoiceNumber: this.invoiceNumber,
        totalAmount: this.totalAmount,
        discountAmount: this.discountAmount,
        discountReason: this.discountReason,
        status: this.status,
        products: this.products,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt,
    };
};

// Add timestamps for createdAt and updatedAt
InvoiceSchema.set("timestamps", true);

module.exports = mongoose.model("Invoice", InvoiceSchema);
