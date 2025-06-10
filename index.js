import express from "express";
import { paymentMiddleware } from "x402-express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const port = process.env.PORT || 4021;

/* ------------------------------------------------------------------ */
/* 1. LATE CORS INJECTION – runs before every request                 */
/* ------------------------------------------------------------------ */
app.use((req, res, next) => {
  // Helper – adds / overwrites the CORS headers we need
  const setCORS = () => {
    res.setHeader("Access-Control-Allow-Origin",  "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers",
                  "Content-Type, Authorization, X-Payment");
    res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate");
  };

  // Patch writeHead so headers are guaranteed to be present
  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    setCORS();                   // inject just before the headers go out
    return originalWriteHead.apply(this, args);
  };

  // Handle the CORS pre-flight quickly
  if (req.method === "OPTIONS") {
    setCORS();
    return res.sendStatus(204);
  }

  next();
});
/* ------------------------------------------------------------------ */

/* -------------------- x402 middleware & routes -------------------- */

// The wallet address that will receive the payments.
// This should be in your .env file.
const walletAddress = process.env.RECIPIENT_WALLET_ADDRESS;
if (!walletAddress) {
  console.error("RECIPIENT_WALLET_ADDRESS environment variable not set.");
  process.exit(1);
}

// For this example, we'll use the public x402 facilitator on Base Sepolia testnet.
const facilitator = { url: "https://x402.org/facilitator" };
const network = "base-sepolia";

// Configure the x402 payment middleware.
// This will protect the "GET /weather" route and require a payment of $0.01.
app.use(
  paymentMiddleware(
    walletAddress,
    {
      "GET /weather": {
        price: "$0.01",
        network: network,
      },
      "GET /transfers": {
        price: "$0.02",
        network: network,
      },
    },
    facilitator
  )
);

app.get("/weather", (req, res) => {
  console.log("Payment successful, sending weather data.");
  res.json({
    weather: "sunny",
    temperature: "25°C",
  });
});

app.get("/free-data", (req, res) => {
  console.log("Sending free data.");
  res.json({
    message: "This data is free!",
  });
});

app.get("/transfers", async (req, res) => {
  try {
    const response = await axios.post("https://02d04771-2524-439e-8d55-d25d9ca868b7.squids.live/squid-indexer@v1/api/graphql", {
      query: `
        query TransfersQuery {
            usdcTransfers(orderBy: block_DESC, limit: 10) {
                id
                block
                from
                to
                value
                txnHash
            }
        }
      `,
    });

    if (response.data.errors) {
      console.error("GraphQL Error:", response.data.errors);
      return res
        .status(500)
        .json({ error: "Error fetching data from Squid GraphQL" });
    }

    res.json(response.data.data.usdcTransfers);
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      console.error("Error connecting to squid:", error.message);
      return res.status(500).json({ error: "Could not connect to the squid indexer. Is it running?" });
    }
    console.error("Error fetching data from squid:", error.message || error);
    res.status(500).json({ error: "Failed to fetch data from squid" });
  }
});

app.get("/", (req, res) => {
    res.send('This is a simple x402 server. Try accessing the <a href="/weather">/weather</a> endpoint.');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Recipient wallet address: ${walletAddress}`);
  console.log('Protected route: GET /weather');
}); 