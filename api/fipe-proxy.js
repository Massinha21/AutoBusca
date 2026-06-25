// api/fipe-proxy.js
// Endpoint Serverless que atua como Proxy de Cache para a API da FIPE (Parallelum)
// Ele absorve o bloqueio (429) usando o Cache da Vercel Edge.

module.exports = async function handler(req, res) {
  // Configuração de CORS e CACHE
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // O segredo para não tomar rate-limit da Parallelum:
  // Cacheamos a resposta do Parallelum nos servidores CDN da Vercel por 24 horas (86400 segundos).
  // Assim, se 1.000 clientes buscarem as marcas de carros, o Parallelum só recebe 1 requisição.
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path } = req.query; // ex: /carros/marcas

  if (!path) {
    return res.status(400).json({ error: "Parâmetro 'path' é obrigatório" });
  }

  try {
    const url = `https://parallelum.com.br/fipe/api/v1${path}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AutoBusca-Vercel-Proxy/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`A API FIPE (Parallelum) retornou status ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("[Fipe Proxy Cache] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
