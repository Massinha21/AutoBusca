const { createClient } = require("@supabase/supabase-js");

// Em desenvolvimento local sem Vercel CLI, podemos tentar carregar o arquivo .env manualmente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  try {
    const fs = require("fs");
    const path = require("path");
    const envPath = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      envContent.split("\n").forEach(line => {
        // Ignora comentários e linhas em branco
        if (line.trim() && !line.startsWith("#")) {
          const parts = line.split("=");
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join("=").trim();
            if (key && !process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn("[Supabase Client] Falha ao ler arquivo .env:", err);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("[Supabase Client] Inicializado com sucesso.");
  } catch (err) {
    console.error("[Supabase Client] Erro ao instanciar o cliente:", err);
  }
} else {
  console.warn(
    "[Supabase Client] Credenciais não configuradas. O aplicativo funcionará de forma degradada sem banco de dados (bypass)."
  );
}

module.exports = { supabase };
