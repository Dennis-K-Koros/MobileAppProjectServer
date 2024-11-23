const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const OrderSchema = new Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  orderDate: { type: Date, default: Date.now },
  completionDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
