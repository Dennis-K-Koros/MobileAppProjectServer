const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const User = require('../models/User/user');

// Create a new order
router.post('/create', async (req, res) => {
  try {
    const { customer, technician, service } = req.body;

    if (!customer || !technician || !service) {
      return res.status(400).json({ error: 'Customer, technician, and service are required.' });
    }

    const customerExists = await User.findById(customer);
    const technicianExists = await User.findById(technician);

    if (!customerExists || customerExists.role !== 'customer') {
      return res.status(400).json({ error: 'Customer not found or invalid role.' });
    }

    if (!technicianExists || technicianExists.role !== 'technician') {
      return res.status(400).json({ error: 'Technician not found or invalid role.' });
    }

    const newOrder = new Order({ customer, technician, service });
    await newOrder.save();

    res.status(201).json({ message: 'Order created successfully.', order: newOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Get all orders for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const query = user.role === 'customer' ? { customer: userId } : { technician: userId };
    const orders = await Order.find(query).populate('customer technician', 'username email');

    res.status(200).json({ message: 'Orders fetched successfully.', orders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// Get a single order by ID
router.get('/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer technician', 'username email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.status(200).json({ message: 'Order fetched successfully.', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});

// Get a specific order for a specific user
router.get('/user/:userId/order/:orderId', async (req, res) => {
  try {
    const { userId, orderId } = req.params;

    // Find the order and populate related fields
    const order = await Order.findById(orderId).populate('customer technician', 'username email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Check if the user is either the customer or the technician for the order
    if (order.customer._id.toString() !== userId && order.technician._id.toString() !== userId) {
      return res.status(403).json({ error: 'You do not have access to this order.' });
    }

    res.status(200).json({ message: 'Order fetched successfully.', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});


// Update an order
router.put('/update/:id', async (req, res) => {
  try {
    const { service, status } = req.body;

    const updatedData = {};
    if (service) updatedData.service = service;
    if (status && ['open', 'closed'].includes(status)) {
      updatedData.status = status;
    } else if (status) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.status(200).json({ message: 'Order updated successfully.', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order', details: error.message });
  }
});

// Delete an order
router.delete('/delete/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.status(200).json({ message: 'Order deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order', details: error.message });
  }
});

module.exports = router;
