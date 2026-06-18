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
  async function buscarCarros(query, signal = null) {
    const url = `${BASE_URL}?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: "GET",
      signal,
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

  /**
   * Conecta ao endpoint de SSE para buscar carros via streaming.
   *
   * @param {string}   query - Termo de busca (ex: "HB20")
   * @param {Object}   callbacks - Objeto contendo callbacks: onInit, onSiteResult, onDone, onError
   * @returns {EventSource} - Referência do EventSource para poder cancelar/fechar se necessário
   */
  function buscarCarrosStream(query, { onInit, onSiteResult, onDone, onError }) {
    const url = `/api/buscar-carros-stream?query=${encodeURIComponent(query)}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener("init", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (onInit) onInit(data);
      } catch (err) {
        console.error("Erro no parse do evento 'init':", err);
      }
    });

    eventSource.addEventListener("site-result", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (onSiteResult) onSiteResult(data);
      } catch (err) {
        console.error("Erro no parse do evento 'site-result':", err);
      }
    });

    eventSource.addEventListener("done", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (onDone) onDone(data);
      } catch (err) {
        console.error("Erro no parse do evento 'done':", err);
      }
      eventSource.close();
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
      eventSource.close();
    };

    return eventSource;
  }

  return { buscarCarros, buscarCarrosStream };
})();
