require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

// 1. Connect to Database
connectDB();

// 2. Middleware
app.use(express.json());

// 3. Define Routes
app.use('/api/jira', projectRoutes);

// 4. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 URL to fetch data: http://localhost:${PORT}/api/jira/fetch`);
});