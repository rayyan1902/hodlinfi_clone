require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error(err));

const dataSchema = new mongoose.Schema({
  name: String,
  last: Number,
  buy: Number,
  sell: Number,
  volume: Number,
  base_unit: String,
});

const DataModel = mongoose.model('Data', dataSchema);

// Fetch data from WazirX API and store in the database
axios
  .get('https://api.wazirx.com/api/v2/tickers')
  .then((response) => {
    const fetchedData = Object.values(response.data);

    // Sort the data based on volume in descending order
    const sortedData = fetchedData.sort((a, b) => b.volume - a.volume);

    // Select top 10 results
    const top10Data = sortedData.slice(0, 10);

    const savePromises = top10Data.map((dataItem) => {
      const data = new DataModel({
        name: dataItem.name,
        last: dataItem.last,
        buy: dataItem.buy,
        sell: dataItem.sell,
        volume: dataItem.volume,
        base_unit: dataItem.base_unit,
      });

      return data.save();
    });

    Promise.all(savePromises)
      .then(() => {
        console.log('Data saved to MongoDB');
        // Start the server after saving data
        app.listen(3000, () => {
          console.log('Server running on port 3000');
        });
      })
      .catch((error) => {
        console.error('Error saving data to MongoDB:', error);
      });
  })
  .catch((error) => {
    console.error('Error fetching data from API:', error);
  });

// API endpoint to retrieve the stored data from the database
app.get('/api/data', async (req, res) => {
  try {
    const fetchedData = await DataModel.find().limit(10);
    res.json(fetchedData);
  } catch (error) {
    console.error('Error retrieving data from MongoDB:', error);
    res.status(500).send('Internal server error');
  }
});

// Serve static files from the public directory
app.use(express.static(__dirname + '/public'));

// Route for the homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});



app.get('/connect/telegram', (req, res) => {
  res.sendFile(__dirname + '/telegram.html');
});
