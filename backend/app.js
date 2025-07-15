// Entry point for backend (Express server)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(express.json({ limit: '10kb' })); // Body size limit

// Import routes
const routes = require('./routes');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Banking Application Backend Running');
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});