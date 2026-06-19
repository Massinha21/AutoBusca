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

  /**
   * Consulta o estoque geral consolidado com filtros e paginação.
   */
  async function buscarEstoqueGeral(filters) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, val);
      }
    }
    const response = await fetch(`/api/estoque-geral?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao consultar estoque geral.");
    }
    return response.json();
  }

  /**
   * Dispara a sincronização de uma loja específica.
   */
  async function syncDealer(dealerName) {
    const response = await fetch(`/api/sync-inventory?dealer=${encodeURIComponent(dealerName)}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao sincronizar loja ${dealerName}.`);
    }
    return response.json();
  }

  /**
   * Cria um alerta de preço.
   */
  async function criarAlerta(email, targetPrice, vehicleUrl = null, query = null) {
    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, target_price: targetPrice, vehicle_url: vehicleUrl, query })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao criar alerta de preço.");
    }
    return response.json();
  }

  /**
   * Lista alertas ativos por e-mail.
   */
  async function listarAlertas(email) {
    const response = await fetch(`/api/alerts?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao obter alertas.");
    }
    return response.json();
  }

  /**
   * Remove um alerta de preço por ID.
   */
  async function removerAlerta(id) {
    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    criarAlerta,
    listarAlertas,
    removerAlerta,
    obterHistoricoPreco,
    auth
  };
})();
