const express = require('express');
const router = express.Router();
const Category = require('../models/category');

// Middleware to parse JSON bodies
router.use(express.json());

// Create Category
router.post('/create', async (req, res) => {
  const { name, subcategories } = req.body;

  if (!name || !subcategories || !subcategories.length) {
    return res.status(400).json({ message: 'Category name and subcategories are required' });
  }

  try {
    const newCategory = new Category({ name, subcategories });
    const savedCategory = await newCategory.save();
    res.status(201).json({ message: 'Category created successfully', category: savedCategory });
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
});


// Get All Categories
router.get('/', (req, res) => {
  Category.find()
    .then(categories => {
      res.json({
        status: "SUCCESS",
        data: categories,
      });
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "Error fetching categories",
        error: error.message,
      });
    });
});

// Update Category
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { name, subcategories } = req.body;

  if (!name && !subcategories) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, subcategories },
      { new: true } // Return the updated document
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully', category: updatedCategory });
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
});


// Delete Category by ID
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;

  Category.findByIdAndDelete(id)
    .then(deletedCategory => {
      if (!deletedCategory) {
        return res.json({
          status: "FAILED",
          message: "Category not found",
        });
      }
      res.json({
        status: "SUCCESS",
        message: "Category deleted successfully",
        data: deletedCategory,
      });
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "Error deleting category",
        error: error.message,
      });
    });
});

module.exports = router;
