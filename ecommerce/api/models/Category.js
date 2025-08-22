const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
});

// Pre-save middleware to update timestamps
CategorySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to check if the category is deleted
CategorySchema.methods.isDeleted = function() {
    return this.deletedAt !== null;
};

// Static method to find non-deleted categories
CategorySchema.statics.findNonDeleted = function() {
    return this.find({ deletedAt: null });
};

// Static method to soft delete a category
CategorySchema.statics.softDelete = function(categoryId) {
    return this.findByIdAndUpdate(categoryId, { deletedAt: Date.now() }, { new: true });
};  

// Static method to restore a soft-deleted category
CategorySchema.statics.restore = function(categoryId) {
    return this.findByIdAndUpdate(categoryId, { deletedAt: null }, { new: true });
};

// Method to get category details
CategorySchema.methods.getDetails = function() {
    return {
        id: this._id,
        name: this.name,
        description: this.description,
        parentCategory: this.parentCategory,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt
    };
};

// Ensure the schema is indexed for better performance
CategorySchema.index({ name: 'text', description: 'text' });

// Add timestamps for createdAt and updatedAt
CategorySchema.set('timestamps', true);

module.exports = mongoose.model('Category', CategorySchema);
