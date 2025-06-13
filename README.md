# Paid Links Service

A decentralized service that allows users to create and share paid links, where access to the content requires payment in cryptocurrency.

## Features

- Create and manage paid links
- Ethereum-based payment system
- Secure authentication using Sign-In with Ethereum (SIWE)
- MongoDB for data storage
- Express.js backend API

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Ethereum wallet (MetaMask recommended)
- Access to an Ethereum network (mainnet or testnet)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
MONGODB_URI=mongodb://localhost:27017/paid-links
RPC_URL=your_ethereum_rpc_url
PLATFORM_WALLET=your_platform_wallet_address
PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=your_contract_address
JWT_SECRET=your_jwt_secret
PORT=4021
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd payments-tutorial
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start running on `http://localhost:4021`

## Smart Contract Deployment

### 1. Install Hardhat
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### 2. Initialize Hardhat
```bash
npx hardhat init
```
Choose "Create a JavaScript project" when prompted.

### 3. Configure Hardhat
Create or update `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

### 4. Deploy Contract
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment, update your `.env` file with the new contract address.

## API Endpoints

### Authentication
- `POST /api/auth/siwe` - Sign in with Ethereum

### Links
- `POST /api/links` - Create a new paid link
- `GET /api/links` - Get all public links
- `GET /api/links/:id` - Access a specific paid link
- `GET /api/balance` - Get user's balance

### Payments
- `POST /api/process-payments` - Process pending payments (admin only)

## Smart Contract

The project uses a smart contract for handling payments. Make sure to:
1. Deploy the contract to your chosen Ethereum network
2. Update the `CONTRACT_ADDRESS` in your `.env` file
3. Ensure the contract ABI is properly set up in the `contracts` directory

## Security Considerations

- Never commit your `.env` file
- Keep your private keys secure
- Use appropriate network (testnet for development)
- Implement rate limiting in production
- Add proper error handling

## License

MIT 