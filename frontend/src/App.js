import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import api from "./api";

function App() {
  const [address, setAddress] = useState("");
  const [token, setToken] = useState(localStorage.getItem("jwt") || "");
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [usdcAmount, setUsdcAmount] = useState("");

  // SIWE login
  async function loginWithEthereum() {
    try {
      setLoading(true);
      setMessage("");
      
      if (!window.ethereum) {
        throw new Error("No wallet found. Please install MetaMask!");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAddress(address);

      // SIWE message
      const siweMsg = {
        domain: window.location.host,
        address,
        statement: "Sign in to Paid Links",
        uri: window.location.origin,
        version: "1",
        chainId: 1337,
        nonce: Math.random().toString(36).substring(2, 10),
      };
      
      // Format message according to SIWE spec
      const msg = [
        `${siweMsg.domain} wants you to sign in with your Ethereum account:`,
        `${siweMsg.address}`,
        ``,
        `${siweMsg.statement}`,
        ``,
        `URI: ${siweMsg.uri}`,
        `Version: ${siweMsg.version}`,
        `Chain ID: ${siweMsg.chainId}`,
        `Nonce: ${siweMsg.nonce}`,
        `Issued At: ${new Date().toISOString()}`
      ].join('\n');

      const signature = await signer.signMessage(msg);

      // Auth request
      const res = await api.post("/auth/siwe", {
        message: msg,
        signature,
      });
      
      setToken(res.data.token);
      localStorage.setItem("jwt", res.data.token);
      setMessage("Вход выполнен!");
    } catch (error) {
      console.error("Login error:", error);
      setMessage(error.message || "Ошибка при входе");
    } finally {
      setLoading(false);
    }
  }

  // Получить все ссылки
  useEffect(() => {
    async function fetchLinks() {
      try {
        const res = await api.get("/links");
        setLinks(res.data);
      } catch (error) {
        console.error("Fetch links error:", error);
        setMessage("Ошибка при загрузке ссылок");
      }
    }
    fetchLinks();
  }, []);

  // Создать ссылку
  async function createLink(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage("");
      if (!window.ethereum) throw new Error("No wallet found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const linkPayment = new ethers.Contract(LINK_PAYMENT_ADDRESS, [
        "function createLink(bytes32 linkId, uint256 price) public",
        "function getLinkInfo(bytes32 linkId) public view returns (address owner, uint256 price, uint256 lastPayment, uint256 balance)"
      ], signer);
      
      // Add timestamp to URL to ensure unique linkId
      const uniqueUrl = `${url}-${Date.now()}`;
      const linkId = ethers.keccak256(ethers.toUtf8Bytes(uniqueUrl));
      
      // Check if link already exists
      try {
        const [owner] = await linkPayment.getLinkInfo(linkId);
        if (owner !== ethers.ZeroAddress) {
          throw new Error("Ссылка с таким URL уже существует");
        }
      } catch (error) {
        if (error.message.includes("Link does not exist")) {
          // This is fine, we can proceed with creation
        } else {
          throw error;
        }
      }
      
      const priceInUsdc = ethers.parseUnits(price, 6); // USDC has 6 decimals
      const tx = await linkPayment.createLink(linkId, priceInUsdc);
      await tx.wait();
      
      // Create link in database
      const res = await api.post("/links", { 
        url, 
        price: priceInUsdc.toString(), 
        description,
        linkId 
      });
      
      setLinks([...links, res.data]);
      setMessage("Ссылка успешно создана!");
      
      // Clear form
      setUrl("");
      setPrice("");
      setDescription("");
    } catch (e) {
      setMessage(e.message || "Ошибка создания ссылки");
    } finally {
      setLoading(false);
    }
  }

  // Получить платную ссылку
  async function getPaidLink(id) {
    try {
      setLoading(true);
      setMessage("");
      
      const res = await api.get(`/links/${id}`);
      window.open(res.data.url, "_blank");
    } catch (error) {
      console.error("Get paid link error:", error);
      setMessage(error.response?.data?.error || error.message || "Ошибка при получении ссылки");
    } finally {
      setLoading(false);
    }
  }

  // Адреса контрактов
  const USDC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const LINK_PAYMENT_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

  // Approve USDC
  async function approveUSDC() {
    try {
      setLoading(true);
      setMessage("");
      if (!window.ethereum) throw new Error("No wallet found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdc = new ethers.Contract(USDC_ADDRESS, [
        "function approve(address spender, uint256 amount) public returns (bool)"
      ], signer);
      const amount = ethers.parseUnits(usdcAmount, 6);
      const tx = await usdc.approve(LINK_PAYMENT_ADDRESS, amount);
      await tx.wait();
      setMessage("Approve успешно выполнен!");
    } catch (e) {
      setMessage(e.message || "Ошибка approve");
    } finally {
      setLoading(false);
    }
  }

  // Deposit USDC
  async function depositUSDC() {
    try {
      setLoading(true);
      setMessage("");
      if (!window.ethereum) throw new Error("No wallet found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const linkPayment = new ethers.Contract(LINK_PAYMENT_ADDRESS, [
        "function deposit(uint256 amount) public"
      ], signer);
      const amount = ethers.parseUnits(usdcAmount, 6);
      const tx = await linkPayment.deposit(amount);
      await tx.wait();
      setMessage("Deposit успешно выполнен!");
    } catch (e) {
      setMessage(e.message || "Ошибка deposit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Paid Links Platform</h2>
      
      {!token ? (
        <button 
          onClick={loginWithEthereum} 
          disabled={loading}
          style={{ padding: "10px 20px" }}
        >
          {loading ? "Загрузка..." : "Войти через Ethereum"}
        </button>
      ) : (
        <div>
          <div>Ваш адрес: {address}</div>
          {/* USDC Approve/Deposit */}
          <div style={{margin: "20px 0", padding: 10, border: "1px solid #eee", borderRadius: 4}}>
            <div style={{marginBottom: 8}}>Пополнить баланс USDC:</div>
            <input
              placeholder="Сумма USDC"
              value={usdcAmount}
              onChange={e => setUsdcAmount(e.target.value)}
              style={{width: 120, marginRight: 8, padding: 6}}
              type="number"
              min="0"
            />
            <button onClick={approveUSDC} disabled={loading || !usdcAmount} style={{marginRight: 8}}>
              Approve
            </button>
            <button onClick={depositUSDC} disabled={loading || !usdcAmount}>
              Deposit
            </button>
          </div>
          <form onSubmit={createLink} style={{ margin: "20px 0" }}>
            <input
              placeholder="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
            />
            <input
              placeholder="Цена (в USDC)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              type="number"
              min="0"
              step="0.000001"
              style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
            />
            <input
              placeholder="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: "10px 20px" }}
            >
              {loading ? "Загрузка..." : "Добавить ссылку"}
            </button>
          </form>
        </div>
      )}

      <h3>Ссылки</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {links.map((link) => (
          <li 
            key={link._id}
            style={{ 
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px"
            }}
          >
            <b>{link.description || "Без описания"}</b>
            <div>Цена: {ethers.formatUnits(link.price, 6)} USDC</div>
            <button 
              onClick={() => getPaidLink(link._id)}
              disabled={loading}
              style={{ marginTop: "5px" }}
            >
              Получить
            </button>
          </li>
        ))}
      </ul>
      
      {message && (
        <div style={{ 
          color: message.includes("Ошибка") ? "red" : "green",
          marginTop: 20,
          padding: "10px",
          backgroundColor: message.includes("Ошибка") ? "#ffebee" : "#e8f5e9",
          borderRadius: "4px"
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default App;