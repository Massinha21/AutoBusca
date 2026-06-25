const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para interpretar JSON (req.body)
app.use(express.json());

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Rota de busca no Marketplace (Mapeando o que seria a Serverless Function da Vercel)
const buscarMarketplace = require('./api/buscar-marketplace.js');
app.post('/api/buscar-marketplace', buscarMarketplace);

// Inicia o servidor local
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Servidor Local rodando em: http://localhost:${PORT}`);
  console.log(`=================================================`);
  console.log(`Abra esse endereço no Chrome para testar a busca real!`);
});
