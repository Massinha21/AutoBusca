// api/alerts.js
// Endpoint para Gerenciamento de Alertas de Preço (Supabase)
// POST: Criar alerta { email, vehicle_url, query, target_price }
// GET: Listar alertas ?email=X
// DELETE: Remover alerta (POST/DELETE com { id })
//

const { supabase } = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Cenário Offline (Sem Supabase) ────────────────────────────────────────
  if (!supabase) {
    console.log("[Alertas] Supabase offline/bypass. Simulando operação de alertas.");
    if (req.method === "POST" || req.method === "DELETE") {
      return res.status(200).json({
        success: true,
        offline: true,
        message: "Operação simulada com sucesso no modo offline."
      });
    }
    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        offline: true,
        alerts: [
          { id: "mock-alert-1", email: req.query.email || "offline@autobusca.com", query: "Palio", target_price: 25000, created_at: new Date().toISOString() }
        ]
      });
    }
    return res.status(405).json({ error: "Método não suportado." });
  }

  // ── Cenário Online (Com Supabase) ─────────────────────────────────────────
  try {
    if (req.method === "POST") {
      const { email, vehicle_url, query, target_price } = req.body || {};
      
      if (!email) {
        return res.status(400).json({ error: "Campo 'email' é obrigatório." });
      }
      if (!vehicle_url && !query) {
        return res.status(400).json({ error: "É necessário informar 'vehicle_url' ou 'query'." });
      }

      const { data, error } = await supabase
        .from("price_alerts")
        .insert({
          email,
          vehicle_url: vehicle_url || null,
          query: query || null,
          target_price: parseFloat(target_price) || 0,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        alert: data[0]
      });
    }

    if (req.method === "GET") {
      const { email } = req.query || {};
      if (!email) {
        return res.status(400).json({ error: "Campo 'email' é obrigatório para listagem." });
      }

      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        alerts: data || []
      });
    }

    if (req.method === "DELETE" || (req.method === "POST" && req.body?.action === "delete")) {
      const id = req.method === "DELETE" ? (req.query.id || req.body?.id) : req.body?.id;
      if (!id) {
        return res.status(400).json({ error: "Campo 'id' é obrigatório para exclusão." });
      }

      const { error } = await supabase
        .from("price_alerts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: "Alerta removido com sucesso."
      });
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    console.error("[Alertas] Erro na API:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor de alertas." });
  }
};
