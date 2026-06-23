/**
 * N'Games - Backend Proxy para API da Anthropic
 * 
 * Como usar:
 *   1. npm install express cors
 *   2. Defina a variável de ambiente: ANTHROPIC_API_KEY=sua_chave_aqui
 *   3. node backend.js
 *   4. Abra o ngames.html no navegador
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
const app = express();
const PORT = 3000;

// ── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve o arquivo HTML estático na raiz
app.use(express.static(path.join(__dirname)));

// ── Rota de saúde ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Proxy para a API da Anthropic ────────────────────────────────────────────
app.post('/api/claude', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente e reinicie o servidor.'
    });
  }

  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: req.body.max_tokens || 1000,
    messages: req.body.messages,
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      res.status(proxyRes.statusCode).set('Content-Type', 'application/json').send(data);
    });
  });

  proxyReq.on('error', (err) => {
    console.error('Erro ao chamar API Anthropic:', err.message);
    res.status(502).json({ error: 'Erro ao conectar com a API da Anthropic.' });
  });

  proxyReq.write(body);
  proxyReq.end();
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Servidor N'Games rodando em http://localhost:${PORT}`);
  console.log(`   Abra http://localhost:${PORT}/ngames.html no seu navegador\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY não definida! As funções de IA não funcionarão.');
    console.warn('   Execute: ANTHROPIC_API_KEY=sua_chave node backend.js\n');
  }
});