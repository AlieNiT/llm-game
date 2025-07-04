require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { getSystemPrompt } = require('./prompts');

const app = express();

app.use(express.json());
app.use(cors());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post('/chat', async (req, res) => {
  const { message, npc, history } = req.body;
  
  console.log('Received chat request:', { message, npc, historyLength: history?.length });
  
  if (!message || !npc || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Message, NPC, and history are required' });
  }

  const systemPrompt = getSystemPrompt(npc);
  if (!systemPrompt) {
    return res.status(400).json({ error: 'Invalid NPC name' });
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    })),
    { role: 'user', content: message }
  ];

  console.log('Sending messages to OpenRouter:', messages);


  const proxyUrl = 'http://127.0.0.1:2081';
  const agent = new HttpsProxyAgent(proxyUrl);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages
      }),
      agent: agent
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', response.status, errorData);
      throw new Error(`API error ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenRouter response:', data);
    

    const reply = data.choices?.[0]?.message?.content;
    
    if (!reply) {
      console.error('No reply found in response:', data);
      throw new Error('No reply content found in API response');
    }

    console.log('Sending reply:', reply);
    res.json({ reply });
    
  } catch (error) {
    console.error('OpenRouter call failed:', error);
    res.status(500).json({ error: 'Failed to fetch LLM response', details: error.message });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
