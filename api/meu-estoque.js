// api/meu-estoque.js
// Endpoint para Gestão de Veículos Próprios (Admin)
// Baseado na tabela public.carros
// GET: Lista os veículos ativos
// POST: Adiciona ou atualiza um veículo (se ID for fornecido)
// DELETE: Inativa um veículo (soft delete)

const { supabase } = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Offline / Bypass Mode
  if (!supabase) {
    console.log("[Meu Estoque] Supabase offline. Retornando mock.");
    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        offline: true,
        carros: []
      });
    }
    return res.status(200).json({ success: true, offline: true, message: "Operação simulada (offline)." });
  }

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("carros")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, carros: data || [] });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const { id, marca, modelo, ano, preco, quilometragem, cor, cidade, estado, imagem_url, fonte, url_externo } = req.body;
      
      if (!marca || !modelo || !ano || !preco) {
        return res.status(400).json({ error: "Campos marca, modelo, ano e preco são obrigatórios." });
      }

      const payload = {
        marca,
        modelo,
        ano: parseInt(ano, 10),
        preco: parseFloat(preco),
        quilometragem: quilometragem ? parseInt(quilometragem, 10) : null,
        cor: cor || null,
        cidade: cidade || null,
        estado: estado || null,
        imagem_url: imagem_url || null,
        fonte: fonte || "Minha Loja",
        url_externo: url_externo || null,
        ativo: true
      };

      let result;
      if (id) {
        // Atualiza existente
        result = await supabase.from("carros").update(payload).eq("id", id).select();
      } else {
        // Cria novo
        result = await supabase.from("carros").insert(payload).select();
      }

      if (result.error) throw result.error;
      return res.status(id ? 200 : 201).json({ success: true, carro: result.data[0] });
    }

    if (req.method === "DELETE") {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: "ID obrigatório para inativar." });

      // Soft delete: set ativo = false
      const { error } = await supabase
        .from("carros")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
      return res.status(200).json({ success: true, message: "Veículo inativado com sucesso." });
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    console.error("[Meu Estoque] Erro:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
};
