require('dotenv').config();
const express = require('express');
const { request, ProxyAgent } = require('undici');
const cors = require('cors');
const { getSystemPrompt } = require('./prompts');

const app = express();

app.use(express.json());
app.use(cors());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const proxyUrl = 'http://127.0.0.1:2081';
const agent = new ProxyAgent(proxyUrl);

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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { body } = await request("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages,
        stream: true
      }),
      dispatcher: agent
    });
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of body) {
      buffer += decoder.decode(chunk, { stream: true });

      let lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line for next chunk

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const jsonStr = line.trim().slice(6);
          if (jsonStr === '[DONE]') {
            res.end();
            return;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              res.write(delta.content);
            }
          } catch (e) {
            // ignore JSON parse errors on partial data
          }
        }
      }
    }
    res.end();

  } catch (error) {
    console.error('OpenRouter call failed:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch LLM response', details: error.message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
