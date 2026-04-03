const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are KenyaWatch AI, an expert anti-corruption intelligence assistant for Kenya. 
You help users understand procurement fraud, ghost projects, corruption patterns, and what actions to take.
You are knowledgeable about:
- Kenya's Public Procurement and Asset Disposal Act (2015 & 2025 amendments)
- The Ethics and Anti-Corruption Commission (EACC)
- Director of Public Prosecutions (DPP)
- Public Procurement Regulatory Authority (PPRA)
- Kenya e-GP platform
- County governance and devolution corruption risks
- M-Pesa and digital financial fraud
- Sentinel-2 satellite imagery for ghost project detection

Be concise, factual, and Kenya-specific. Use **bold** for key figures and names.
Always end responses with a clear, practical action step the user can take.
Keep responses under 300 words. Format with line breaks for readability.`;

router.post('/chat', async (req, res) => {
  const { message, session_id } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

  try {
    // Log user message
    if (session_id) {
      await pool.query(
        'INSERT INTO chat_logs (session_id, role, content) VALUES ($1, $2, $3)',
        [session_id, 'user', message]
      ).catch(() => {}); // non-blocking
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }]
    });

    const reply = response.content.map(b => b.text || '').join('');

    // Log AI reply
    if (session_id) {
      await pool.query(
        'INSERT INTO chat_logs (session_id, role, content) VALUES ($1, $2, $3)',
        [session_id, 'assistant', reply]
      ).catch(() => {});
    }

    res.json({ success: true, reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ success: false, error: 'AI service temporarily unavailable' });
  }
});

module.exports = router;
