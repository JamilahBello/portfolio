const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
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
        },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
});

// Pre-save middleware to update timestamps
CartSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

CartSchema.statics.findOrCreate = async function (userId) {
    return this.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, products: [] } },
      { new: true, upsert: true } // no metadata, just the doc
    );
};

// Static method to find non-deleted carts
CartSchema.statics.findNonDeleted = function () {
    return this.find({ deletedAt: null });
};

CartSchema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
});

CartSchema.methods.softDelete = async function () {
    if (!this.deletedAt) {
      this.deletedAt = new Date();
      await this.save();
    }
    return this;
};

// Static method to restore a soft-deleted cart
CartSchema.statics.restore = function (cartId) {
    return this.findByIdAndUpdate(cartId, { deletedAt: null }, { new: true });
};

// Method to get cart details
CartSchema.methods.getDetails = function () {
    return {
        id: this._id,
        userId: this.userId,
        products: this.products,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt,
    };
};

CartSchema.virtual("totalPrice").get(function () {
    const Product = mongoose.model("Product");
    return this.products.reduce((total, product) => {
        const productDetails = Product.findById(product.productId);
        return total + productDetails.price * product.quantity;
    }, 0);
});

// Add timestamps for createdAt and updatedAt
CartSchema.set("timestamps", true);

module.exports = mongoose.model("Cart", CartSchema);
