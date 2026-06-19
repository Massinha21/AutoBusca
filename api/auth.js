// api/auth.js
// Endpoint para Autenticação (Supabase Auth)
// Recebe: POST { action: "login"|"signup", email, password }
//

const { supabase } = require("./lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const { action, email, password } = req.body || {};

  if (!action) {
    return res.status(400).json({ error: "Campo 'action' é obrigatório." });
  }

  // ── Cenário Offline (Sem Supabase) ────────────────────────────────────────
  if (!supabase) {
    console.log(`[Auth] Supabase offline/bypass. Simulando action: "${action}" para o e-mail: ${email}`);
    
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }

    return res.status(200).json({
      success: true,
      offline: true,
      user: {
        id: "mock-uid-12345",
        email: email
      },
      session: {
        access_token: "mock-session-token-xyz"
      }
    });
  }

  // ── Cenário Online (Com Supabase) ─────────────────────────────────────────
  try {
    if (action === "signup") {
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;
      return res.status(200).json({
        success: true,
        user: data.user,
        session: data.session
      });
    }

    if (action === "login") {
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return res.status(200).json({
        success: true,
        user: data.user,
        session: data.session
      });
    }

    return res.status(400).json({ error: "Ação de autenticação inválida." });
  } catch (err) {
    console.error("[Auth] Erro ao autenticar no Supabase:", err.message);
    return res.status(400).json({ error: err.message });
  }
};
