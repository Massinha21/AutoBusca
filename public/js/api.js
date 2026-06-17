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

  /**
   * Chama a Serverless Function para buscar carros.
   *
   * @param {string}   query - Termo de busca (ex: "HB20")
   * @param {string[]} urls  - Lista de URLs das revendas a pesquisar
   * @returns {Promise<{
   *   query:   string,
   *   total:   number,
   *   sites:   Array<{ name: string, status: string, count: number, error?: string }>,
   *   results: Array<{ title, price, price_value, image_url, url, dealer_name }>
   * }>}
   * @throws {Error} Se a requisição falhar ou a API retornar erro
   */
  async function buscarCarros(query, urls = []) {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, urls }),
    });

    // Se o servidor retornou um status de erro (4xx, 5xx), lança exceção
    if (!response.ok) {
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errData = await response.json();
        if (errData.error) errorMsg = errData.error;
      } catch {
        // Se o corpo não for JSON, usa a mensagem padrão
      }
      throw new Error(errorMsg);
    }

    // Converte o corpo da resposta de JSON para objeto JavaScript
    const data = await response.json();
    return data;
  }

  return { buscarCarros };
})();
