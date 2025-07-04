require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { HttpsProxyAgent } = require('https-proxy-agent'); // Note the curly braces

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const API_KEY = process.env.GEMINI_API_KEY;

app.post('/chat', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Define the proxy agent
  const proxyUrl = 'http://127.0.0.1:2081';
  const agent = new HttpsProxyAgent(proxyUrl);

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  
  const payload = {
    contents: [{
      parts: [{
        text: message
      }]
    }]
  };

  try {
    // Pass the agent to the fetch options
    const apiResponse = await fetch(`${url}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      agent: agent // This line routes the request through your proxy
    });

    if (!apiResponse.ok) {
        const errorData = await apiResponse.text();
        throw new Error(`API call failed with status: ${apiResponse.status}, details: ${errorData}`);
    }

    const data = await apiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling Google AI API:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
});
