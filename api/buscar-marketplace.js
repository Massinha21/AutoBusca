const facebookMarketplaceScraper = require('./_scrapers/facebook-marketplace');

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body || {};

    if (!query) {
      return res.status(400).json({ error: 'Parâmetro query é obrigatório' });
    }

    console.log(`[API] Iniciando busca no Facebook Marketplace para: "${query}"`);
    const startTime = Date.now();

    // Chama o scraper
    const results = await facebookMarketplaceScraper.search(query);

    const elapsed = Date.now() - startTime;
    console.log(`[API] Busca concluída em ${elapsed}ms. Itens encontrados: ${results.length}`);

    return res.status(200).json({
      success: true,
      query,
      count: results.length,
      results,
      elapsed_ms: elapsed
    });

  } catch (err) {
    console.error('[API] Erro interno:', err);
    return res.status(500).json({
      error: 'Erro interno no servidor ao buscar no Marketplace',
      details: err.message
    });
  }
};
