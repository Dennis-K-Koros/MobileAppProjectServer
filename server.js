//mongodb
require('./config/db');

const app = require('express')();
const port = process.env.PORT || 5000;

const bodyParser = require('express').json;
app.use(bodyParser());

const UserRouter = require('./api/User');
const CategoryRouter = require('./api/category');
const FavouriteRouter = require('./api/favourite');
const OrderRouter = require('./api/order');
const ServiceRouter = require('./api/service');


// Routes
app.use('/user', UserRouter);
app.use('/category', CategoryRouter);
app.use('/favourite', FavouriteRouter);
app.use('/order', OrderRouter);
app.use('/service', ServiceRouter);


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});