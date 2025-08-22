const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    quantity: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
});

// Pre-save middleware to update timestamps
ProductSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find non-deleted products
ProductSchema.statics.findNonDeleted = function () {
    return this.find({ deletedAt: null });
};

ProductSchema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
});

ProductSchema.methods.softDelete = async function () {
    if (!this.deletedAt) {
      this.deletedAt = new Date();
      await this.save();
    }
    return this;
};

// Static method to restore a soft-deleted product
ProductSchema.statics.restore = function (productId) {
    return this.findByIdAndUpdate(
        productId,
        { deletedAt: null },
        { new: true },
    );
};

// Method to get product details
ProductSchema.methods.getDetails = function () {
    return {
        id: this._id,
        name: this.name,
        description: this.description,
        price: this.price,
        category: this.category,
        quantity: this.quantity,
        images: this.images,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt,
    };
};

// Add virtuals for product image URLs
ProductSchema.virtual("imageUrls").get(function () {
    return this.images.map((image) => `${process.env.CLOUDINARY_URL}/${image}`);
});

// Add timestamps for createdAt and updatedAt
ProductSchema.set("timestamps", true);

module.exports = mongoose.model("Product", ProductSchema);
