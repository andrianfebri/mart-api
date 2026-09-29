require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

const martRoutes = require('./routes/martRoutes');
app.use('/api', martRoutes);

app.listen(PORT, () => {
    console.log(`Server Mart running at http://localhost:${PORT}/`);
});