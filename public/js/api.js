// public/js/api.js
//
// Responsável por CHAMAR a Serverless Function na Vercel via fetch().
// Centralizar as chamadas de rede aqui facilita trocar a URL da API,
// adicionar autenticação futura, ou tratar erros de rede globalmente.
//
// Uso:
//   const resultado = await Api.buscarCarros("HB20", ["https://site.com"]);
//   // resultado = { query, total, sites, results }

const Api = (() => {
  // URL base da API.
  // Em desenvolvimento (vercel dev), o endpoint fica em /api/buscar-carros.
  // Em produção na Vercel, o caminho é o mesmo — a Vercel cuida do roteamento.
  const BASE_URL = "/api/buscar-carros";

  ,
      body: JSON.stringify({ action: "delete", id })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao remover alerta.");
    }
    return response.json();
  }

  /**
   * Obtém a série histórica de preços de um veículo.
   */
  async function obterHistoricoPreco(url, currentPrice) {
    const response = await fetch(`/api/price-history?url=${encodeURIComponent(url)}&price=${currentPrice}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao obter histórico de preço.");
    }
    return response.json();
  }

  /**
   * Realiza login/cadastro na proxy de autenticação.
   */
  async function auth(action, email, password) {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email, password })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao realizar autenticação.");
    }
    return response.json();
  }

  return {
    buscarCarros,
    buscarCarrosStream,
    buscarEstoqueGeral,
    syncDealer,
    obterHistoricoPreco,
    auth
  };
})();
