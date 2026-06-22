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

    console.log(`[API] Retornando Mock Data do Facebook Marketplace para: "${query}"`);

    // Mock data direto para evitar limites de timeout e build da Vercel
    const mockData = [
      {
        title: "Chevrolet Onix 1.0 LT (Simulação Vercel)",
        year: 2019,
        km: 45000,
        price_value: 52000,
        price: "R$ 52.000",
        image_url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        url: "https://www.facebook.com/marketplace",
        dealer_name: "Facebook Marketplace",
        quality_badge: "good",
        quality_reason: "Anúncio completo (Preço, Ano e KM informados). Valores aparentam normalidade."
      },
      {
        title: "Onix Joy 2018 Oportunidade",
        year: 2018,
        km: 0,
        price_value: 12000,
        price: "R$ 12.000",
        image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
        url: "https://www.facebook.com/marketplace",
        dealer_name: "Facebook Marketplace",
        quality_badge: "suspicious",
        quality_reason: "Preço muito abaixo do mercado para o ano. Alto risco de fraude ou repasse."
      },
      {
        title: "Onix Completo Único Dono",
        year: 0,
        km: 0,
        price_value: 0,
        price: "Consulte",
        image_url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=80",
        url: "https://www.facebook.com/marketplace",
        dealer_name: "Facebook Marketplace",
        quality_badge: "neutral",
        quality_reason: "Preço ausente ou informações insuficientes para avaliação."
      }
    ];

    // Simula um delay de busca de 2 segundos para dar tempo de ver os skeletons
    await new Promise(resolve => setTimeout(resolve, 2000));

    return res.status(200).json({
      success: true,
      query,
      count: mockData.length,
      results: mockData,
      elapsed_ms: 2000
    });

  } catch (err) {
    console.error('[API] Erro interno:', err);
    return res.status(500).json({
      error: 'Erro interno no servidor ao buscar no Marketplace',
      details: err.message
    });
  }
};
