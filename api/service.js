const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Service = require('../models/service'); // Import Service model
const Category = require('../models/category'); // Import Category model

// Middleware to parse JSON bodies
router.use(express.json());

//create service
router.post('/create', async (req, res) => {
  const { subcategory, serviceName, description, price, image } = req.body;

  if (!subcategory || !serviceName || !price) {
    return res.status(400).json({ message: 'Subcategory, serviceName, and price are required' });
  }

  try {
    const service = new Service({ subcategory, serviceName, description, price, image });
    const savedService = await service.save();
    res.status(201).json({ message: 'Service created successfully', service: savedService });
  } catch (error) {
    res.status(500).json({ message: 'Error creating service', error: error.message });
  }
});


// Fetch all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find(); // Fetch all services

    // Manually populate subcategories
    const populatedServices = await Promise.all(
      services.map(async (service) => {
        const category = await Category.findOne({ 'subcategories._id': service.subcategory }); // Find the category containing the subcategory
        if (category) {
          const subcategory = category.subcategories.id(service.subcategory); // Find the specific subcategory
          return {
            ...service._doc,
            subcategory: subcategory ? subcategory.name : null, // Replace ObjectId with subcategory name or null if not found
          };
        }
        return { ...service._doc, subcategory: null }; // If no category found, set subcategory as null
      })
    );

    res.status(200).json({ message: 'Services fetched successfully', services: populatedServices });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services', error: error.message });
  }
});




// Update Service
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { subcategory, serviceName, description, price, image } = req.body;

  // Ensure at least one field is being updated
  if (!subcategory && !serviceName && !description && !price && !image) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  try {
    // Validate and convert subcategory to ObjectId
    if (subcategory) {
      if (!mongoose.Types.ObjectId.isValid(subcategory)) {
        return res.status(400).json({ message: 'Invalid subcategory ID' });
      }
    }

    // Check if the subcategory exists
    const categoryWithSubcategory = await Category.findOne({ 'subcategories._id': subcategory });

    if (!categoryWithSubcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    // Update the service
    const updatedService = await Service.findByIdAndUpdate(
      id,
      { subcategory, serviceName, description, price, image },
      { new: true } // Return the updated document
    );

    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service updated successfully', service: updatedService });
  } catch (error) {
    res.status(500).json({ message: 'Error updating service', error: error.message });
  }
});


// Delete Service by ID
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;

  Service.findByIdAndDelete(id)
    .then(deletedService => {
      if (!deletedService) {
        return res.json({
          status: "FAILED",
          message: "Service not found",
        });
      }
      res.json({
        status: "SUCCESS",
        message: "Service deleted successfully",
        data: deletedService,
      });
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "Error deleting service",
        error: error.message,
      });
    });
});

module.exports = router;
