// api/price-history.js
// Endpoint para obter a Série Histórica de Preços de um Veículo (Supabase)
// Recebe: GET /api/price-history?url=URL_DO_VEICULO&price=PRECO_ATUAL
//

const { supabase } = require("./lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET." });
  }

  const { url, price } = req.query || {};
  if (!url) {
    return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });
  }

  const currentPrice = parseFloat(price) || 45000;

  // ── Cenário Offline (Sem Supabase) ────────────────────────────────────────
  if (!supabase) {
    console.log("[Price History] Supabase offline/bypass. Gerando histórico simulado.");
    
    // Gera histórico fictício e coerente com o preço atual do carro
    const history = [
      {
        price_value: Math.round(currentPrice * 1.08),
        recorded_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        price_value: Math.round(currentPrice * 1.04),
        recorded_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        price_value: currentPrice,
        recorded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return res.status(200).json({
      success: true,
      offline: true,
      history
    });
  }

  // ── Cenário Online (Com Supabase) ─────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("price_history")
      .select("price_value, recorded_at")
      .eq("vehicle_url", url)
      .order("recorded_at", { ascending: true });

    if (error) throw error;

    // Se o banco não tiver histórico gravado ainda, retorna o preço atual como ponto inicial
    let history = data || [];
    if (history.length === 0) {
      history = [
        {
          price_value: currentPrice,
          recorded_at: new Date().toISOString()
        }
      ];
    }

    return res.status(200).json({
      success: true,
      history
    });
  } catch (err) {
    console.error("[Price History] Erro ao buscar histórico:", err.message);
    return res.status(500).json({ error: "Erro interno ao buscar histórico de preços." });
  }
};
