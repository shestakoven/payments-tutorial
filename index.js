import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import { SiweMessage } from "siwe";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read contract ABI
const contractABI = JSON.parse(readFileSync(join(__dirname, 'contracts', 'LinkPayment.json'), 'utf8'));

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/paid-links')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Link Schema
const linkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  owner: { type: String, required: true }, // Wallet address of the creator
  price: { type: String, required: true }, // Price in USD
  description: String,
  createdAt: { type: Date, default: Date.now },
  accessCount: { type: Number, default: 0 },
  linkId: { type: String, required: true, unique: true } // Keccak256 hash of URL
});

const Link = mongoose.model('Link', linkSchema);

// Web3 setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Sign in with Ethereum
app.post('/api/auth/siwe', async (req, res) => {
  try {
    const { message, signature } = req.body;
    
    // Parse the message to get the address
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    const address = addressMatch[0];

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Generate JWT token
    const token = jwt.sign({ address }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    console.error('SIWE error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Developer routes
app.post('/api/links', authenticateToken, async (req, res) => {
  try {
    const { url, price, description, linkId } = req.body;

    // Create link in database only
    const link = new Link({
      url,
      owner: req.user.address,
      price,
      description,
      linkId
    });
    await link.save();

    res.json(link);
  } catch (error) {
    console.error('Create link error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all links (public)
app.get('/api/links', async (req, res) => {
  try {
    const links = await Link.find({}, { url: 0 }); // Don't expose URLs
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Access paid link
app.get('/api/links/:id', authenticateToken, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Check if user has enough balance
    const userBalance = await contract.userBalances(req.user.address);
    if (userBalance < ethers.parseUnits(link.price, 6)) {
      return res.status(402).json({ error: 'Insufficient balance' });
    }

    // Update access count
    link.accessCount += 1;
    await link.save();

    // Return the actual URL
    res.json({ url: link.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user balance
app.get('/api/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await contract.userBalances(req.user.address);
    res.json({ balance: ethers.formatEther(balance) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process payments (cron job endpoint)
app.post('/api/process-payments', async (req, res) => {
  try {
    const links = await Link.find({});
    const linkIds = links.map(link => link.linkId);
    
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contractWithSigner = contract.connect(signer);
    await contractWithSigner.processPayments(linkIds);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const port = process.env.PORT || 4021;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}); 