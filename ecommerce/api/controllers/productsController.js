const Product = require('../models/Product');

exports.createProduct = async (req, res, next) => {
  try {
    const { name, price, description, category } = req.body;
    const product = new Product({ name, price, description, category });
    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    next(err);
  }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.status(200).json({ products });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getProductByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category });
    
    res.status(200).json({ products });
  } catch (err) {
    next(err);
  }
};

exports.updateProductStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const stock = product.stock + (quantity);
    await product.updateStock(stock);

    res.status(200).json({ message: 'Product stock updated successfully', product });
  } catch (err) {
    next(err);
  }
};

exports.addProductImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { images } = req.body;
    const product = await Product.findByIdAndUpdate(id, { images }, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json({ message: 'Product images added successfully', product });
  } catch (err) {
    next(err);
  }
};

exports.updateProductImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { images } = req.body;
    const product = await Product.findByIdAndUpdate(id, { images }, { new: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json({ message: 'Product images updated successfully', product });
  } catch (err) {
    next(err);
  }
};