const express = require('express');
const router = express.Router();
const Favorite = require('../models/favourite');

// Middleware to parse JSON bodies
router.use(express.json());

// Add Favorite
router.post('/create', (req, res) => {
  const { userId, serviceId } = req.body;

  if (!userId || !serviceId) {
    return res.json({
      status: "FAILED",
      message: "User ID and Service ID are required!",
    });
  }

  const newFavorite = new Favorite({
    userId,
    serviceId,
  });

  newFavorite
    .save()
    .then(favorite => {
      res.json({
        status: "SUCCESS",
        message: "Favorite added successfully",
        data: favorite,
      });
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "Error adding favorite",
        error: error.message,
      });
    });
});

// Get Favorites for a User
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  Favorite.find({ userId })
    .populate('serviceId')
    .then(favorites => {
      res.json({
        status: "SUCCESS",
        data: favorites,
      });
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "Error fetching favorites",
        error: error.message,
      });
    });
});

// Remove Favorite by ID
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;

  Favorite.findByIdAndDelete(id)
    .then(deletedFavorite => {
      if (!deletedFavorite) {
        return res.json({
          status: "FAILED",
          message: "Favorite not found",
        });
      }
      res.json({
        status: "SUCCESS",
        message: "Favorite removed successfully",
        data: deletedFavorite,
      });
    })
    .catch(error => {
      res.json({
        status: "FAILED",
        message: "Error removing favorite",
        error: error.message,
      });
    });
});

module.exports = router;
