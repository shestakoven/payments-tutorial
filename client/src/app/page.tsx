'use client';

import { useState } from 'react';
import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import { Hex } from 'viem';
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client';

// The base URL of your backend server
const BACKEND_URL = 'https://payments-tutorial-production.up.railway.app';

export default function Home() {
  const [freeResponse, setFreeResponse] = useState<string>('');
  const [paidResponse, setPaidResponse] = useState<string>('');
  const [transfersResponse, setTransfersResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFreeApiCall = async () => {
    setLoading(true);
    setError('');
    setFreeResponse('');
    try {
      const res = await axios.get(`${BACKEND_URL}/free-data`);
      setFreeResponse(JSON.stringify(res.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(`Error fetching free data: ${err.message}`);
      } else {
        setError(`An unexpected error occurred: ${String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaidApiCall = async () => {
    setLoading(true);
    setError('');
    setPaidResponse('');

    let privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;

    if (!privateKey || privateKey === '0xYourTestnetPrivateKey' || privateKey.trim() === '') {
      setError('Please set your private key in client/.env.local');
      setLoading(false);
      return;
    }

    // Ensure the private key is a hex string with a '0x' prefix
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }
    
    // Validate the private key format
    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
        setError('Invalid private key format. It must be a 64-character hex string starting with 0x.');
        setLoading(false);
        return;
    }

    try {
      // Create a plain axios instance without the interceptor
      const plainClient = axios.create({ baseURL: BACKEND_URL });
      const res = await plainClient.get('/weather');
      setPaidResponse(JSON.stringify(res.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 402) {
        console.log("[x402] Payment required, handling manually...");
        try {
            const account = privateKeyToAccount(privateKey as Hex);
            const paymentInfo = err.response.data;

            // Manually select the payment requirements from the 402 response
            const selectedReq = selectPaymentRequirements(
                paymentInfo.accepts,
                'base-sepolia',
                'exact'
            );

            if (!selectedReq) {
                throw new Error("No suitable payment requirement found.");
            }

            // Create the payment header
            const paymentHeader = await createPaymentHeader(
                account,
                paymentInfo.x402Version,
                selectedReq,
            );

            // Retry the request with the payment header
            const plainClient = axios.create({ baseURL: BACKEND_URL });
            const paidRes = await plainClient.get('/weather', {
                headers: {
                    'X-PAYMENT': paymentHeader
                }
            });

            setPaidResponse(JSON.stringify(paidRes.data, null, 2));

        } catch (paymentError) {
            console.error("Payment handling failed:", paymentError);
            let errorMessage = 'An unknown error occurred during payment.';
            if (axios.isAxiosError(paymentError)) {
                errorMessage = paymentError.response?.data?.error || paymentError.message;
            } else if (paymentError instanceof Error) {
                errorMessage = paymentError.message;
            }
            setError(`Error fetching paid data: ${errorMessage}`);
        }
      } else {
        console.error(err);
        let errorMessage = 'An unknown error occurred.';
        if (axios.isAxiosError(err)) {
          errorMessage = err.response?.data?.error || err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(`Error fetching paid data: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTransfersApiCall = async () => {
    setLoading(true);
    setError('');
    setTransfersResponse('');

    let privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;

    if (!privateKey || privateKey === '0xYourTestnetPrivateKey' || privateKey.trim() === '') {
      setError('Please set your private key in client/.env.local');
      setLoading(false);
      return;
    }

    // Ensure the private key is a hex string with a '0x' prefix
    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }
    
    // Validate the private key format
    if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
        setError('Invalid private key format. It must be a 64-character hex string starting with 0x.');
        setLoading(false);
        return;
    }

    try {
      // Create a plain axios instance without the interceptor
      const plainClient = axios.create({ baseURL: BACKEND_URL });
      const res = await plainClient.get('/transfers');
      setTransfersResponse(JSON.stringify(res.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 402) {
        console.log("[x402] Payment required, handling manually...");
        try {
            const account = privateKeyToAccount(privateKey as Hex);
            const paymentInfo = err.response.data;

            // Manually select the payment requirements from the 402 response
            const selectedReq = selectPaymentRequirements(
                paymentInfo.accepts,
                'base-sepolia',
                'exact'
            );

            if (!selectedReq) {
                throw new Error("No suitable payment requirement found.");
            }

            // Create the payment header
            const paymentHeader = await createPaymentHeader(
                account,
                paymentInfo.x402Version,
                selectedReq,
            );

            // Retry the request with the payment header
            const plainClient = axios.create({ baseURL: BACKEND_URL });
            const paidRes = await plainClient.get('/transfers', {
                headers: {
                    'X-PAYMENT': paymentHeader
                }
            });

            setTransfersResponse(JSON.stringify(paidRes.data, null, 2));

        } catch (paymentError) {
            console.error("Payment handling failed:", paymentError);
            let errorMessage = 'An unknown error occurred during payment.';
            if (axios.isAxiosError(paymentError)) {
                errorMessage = paymentError.response?.data?.error || paymentError.message;
            } else if (paymentError instanceof Error) {
                errorMessage = paymentError.message;
            }
            setError(`Error fetching transfers data: ${errorMessage}`);
        }
      } else {
        console.error(err);
        let errorMessage = 'An unknown error occurred.';
        if (axios.isAxiosError(err)) {
          errorMessage = err.response?.data?.error || err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(`Error fetching transfers data: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
        <h1 className="text-4xl font-bold text-center w-full">x402 Next.js Client</h1>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free API Call Card */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Free API Call</h2>
          <p className="mb-4 text-gray-400">This button calls a standard API endpoint that does not require payment.</p>
          <button
            onClick={handleFreeApiCall}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
          >
            {loading ? 'Loading...' : 'Call Free API'}
          </button>
          {freeResponse && (
            <div className="mt-4 bg-gray-700 p-4 rounded">
              <h3 className="font-bold">Response:</h3>
              <pre className="whitespace-pre-wrap break-words text-sm">{freeResponse}</pre>
            </div>
          )}
        </div>

        {/* Paid API Call Card */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Paid API Call</h2>
          <p className="mb-4 text-gray-400">This button calls an endpoint protected by x402. It will automatically handle the payment.</p>
          <button
            onClick={handlePaidApiCall}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
          >
            {loading ? 'Loading...' : 'Call Paid API ($0.01)'}
          </button>
          {paidResponse && (
            <div className="mt-4 bg-gray-700 p-4 rounded">
              <h3 className="font-bold">Response:</h3>
              <pre className="whitespace-pre-wrap break-words text-sm">{paidResponse}</pre>
            </div>
          )}
        </div>

        {/* Squid Transfers Card */}
        <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Squid Indexer Data</h2>
            <p className="mb-4 text-gray-400">This button fetches the latest USDC transfers indexed by the Subsquid instance via the backend.</p>
            <button
                onClick={handleTransfersApiCall}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
            >
                {loading ? 'Loading...' : 'Fetch Transfers ($0.02)'}
            </button>
            {transfersResponse && (
                <div className="mt-4 bg-gray-700 p-4 rounded">
                    <h3 className="font-bold">Response:</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm">{transfersResponse}</pre>
                </div>
            )}
        </div>
      </div>

      {error && (
        <div className="mt-8 w-full max-w-2xl bg-red-800 border border-red-600 text-white p-4 rounded">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}
    </main>
  );
}
