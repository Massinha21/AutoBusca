// public/js/app.js
//
// MÓDULO PRINCIPAL — orquestra todos os outros módulos:
//   Storage → carrega/salva URLs e tema
//   Api     → chama a serverless function
//   UI      → renderiza os resultados
//
// Este arquivo contém toda a lógica de negócio do front-end:
//   - Inicialização da página
//   - Gerenciamento do formulário de busca
//   - Gerenciamento do painel de URLs
//   - Alternância de tema dark/light
//   - Ordenação dos resultados

document.addEventListener("DOMContentLoaded", () => {

  // ── Estado global da aplicação ─────────────────────────────────────────
  let allCars    = [];   // Array com todos os carros da última busca
  let isSearching = false; // Evita múltiplas buscas simultâneas

  // ── Elementos do DOM ───────────────────────────────────────────────────
  const searchForm     = document.getElementById("search-form");
  const searchInput    = document.getElementById("search-input");
  const searchBtn      = document.getElementById("search-btn");
  const themeToggle    = document.getElementById("theme-toggle");
  const urlsPanel      = document.getElementById("urls-panel");
  const urlsPanelToggle= document.getElementById("urls-panel-toggle");
  const urlsTextarea   = document.getElementById("urls-textarea");
  const urlsCount      = document.getElementById("urls-count");
  const btnSaveUrls    = document.getElementById("btn-save-urls");
  const btnClearUrls   = document.getElementById("btn-clear-urls");
  const btnLoadDefaults= document.getElementById("btn-load-defaults");
  const urlsSavedNotice= document.getElementById("urls-saved-notice");
  const sortSelect     = document.getElementById("sort-select");
  const btnExportCsv   = document.getElementById("btn-export-csv");

  // ══════════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ══════════════════════════════════════════════════════════════════════

  function init() {
    loadThemePreference();
    loadSavedUrls();
    bindEvents();
  }

  /**
   * Aplica o tema salvo no localStorage ao carregar a página.
   */
  function loadThemePreference() {
    const theme = Storage.loadTheme();
    document.body.classList.remove("dark-theme", "light-theme");
    document.body.classList.add(`${theme}-theme`);
  }

  /**
   * Carrega as URLs salvas no localStorage para o textarea.
   */
  function loadSavedUrls() {
    let saved = Storage.loadUrls();
    if (saved.length === 0) {
      saved = Storage.getDefaultUrls();
      Storage.saveUrls(saved);
    }

    if (saved.length > 0) {
      urlsTextarea.value = Storage.urlsToText(saved);
      updateUrlsCount(saved.length);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // BINDING DE EVENTOS
  // ══════════════════════════════════════════════════════════════════════

  function bindEvents() {
    // Formulário de busca
    searchForm.addEventListener("submit", handleSearchSubmit);

    // Alternância de tema
    themeToggle.addEventListener("click", handleThemeToggle);

    // Painel de URLs
    urlsPanelToggle.addEventListener("click",   toggleUrlsPanel);
    urlsPanelToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleUrlsPanel();
      }
    });

    // Botões do painel de URLs
    btnSaveUrls.addEventListener("click",    handleSaveUrls);
    btnClearUrls.addEventListener("click",   handleClearUrls);
    btnLoadDefaults.addEventListener("click",handleLoadDefaults);

    // Atualiza contador de URLs enquanto o usuário digita
    urlsTextarea.addEventListener("input", () => {
      const count = Storage.parseUrlText(urlsTextarea.value).length;
      updateUrlsCount(count);
    });

    // Ordenação dos resultados
    sortSelect.addEventListener("change", () => {
      if (allCars.length > 0) {
        const sorted = sortCars(allCars, sortSelect.value);
        UI.renderCars(sorted);
      }
    });

    // Exportar CSV
    btnExportCsv.addEventListener("click", () => {
      if (allCars.length > 0) exportToCsv(allCars);
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // BUSCA
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Dispara quando o usuário submete o formulário.
   * Valida o input, coleta as URLs e inicia a busca.
   */
  async function handleSearchSubmit(e) {
    e.preventDefault();

    if (isSearching) return;

    const query = searchInput.value.trim();
    if (!query) {
      searchInput.focus();
      return;
    }

    // Coleta as URLs digitadas no textarea (ou array vazio se painel fechado)
    const urlsText = urlsTextarea.value;
    const urls = Storage.parseUrlText(urlsText);

    await runSearch(query, urls);
  }

  /**
   * Executa a busca: chama a API, atualiza UI de progresso e exibe resultados.
   *
   * @param {string}   query - Termo de busca
   * @param {string[]} urls  - URLs das revendas a consultar
   */
  async function runSearch(query, urls) {
    isSearching = true;

    // ── Prepara a UI para o estado de carregamento ──
    setSearchLoading(true);
    UI.showSkeletons(6);
    UI.showProgress(Math.max(urls.length, 1));
    UI.hideResultsControls();
    UI.updateStoreBadge("Buscando...", "searching", "Em andamento");

    allCars = [];

    try {
      const data = await Api.buscarCarros(query, urls);

      // Processa os resultados retornados
      allCars = data.results || [];

      // Atualiza badges de cada loja no painel de progresso
      if (data.sites && data.sites.length > 0) {
        data.sites.forEach((site, i) => {
          // Simula progresso escalonado para feedback visual
          setTimeout(() => {
            UI.setProgressBar(i + 1, data.sites.length, `Processado: ${site.name}`);
            UI.updateStoreBadge(
              site.name,
              site.status,
              site.status === "error"
                ? `Erro: ${site.error || "falha"}`
                : `${site.count} enc.`
            );
          }, i * 120); // Atraso para efeito visual cascata
        });

        // Após todos os badges, exibe os resultados finais
        const finalDelay = data.sites.length * 120 + 200;
        setTimeout(() => finishSearch(allCars, query), finalDelay);
      } else {
        finishSearch(allCars, query);
      }

    } catch (err) {
      console.error("[AutoBusca] Erro na busca:", err);
      UI.hideProgress();
      UI.renderError(err.message || "Erro de conexão com o servidor. Tente novamente.");
      setSearchLoading(false);
      isSearching = false;
    }
  }

  /**
   * Finaliza a busca: esconde loading, exibe resultados e controles.
   *
   * @param {Array}  cars  - Array de carros encontrados
   * @param {string} query - Termo buscado (para mensagem de estado vazio)
   */
  function finishSearch(cars, query) {
    setSearchLoading(false);
    isSearching = false;

    UI.hideProgress();

    if (cars.length === 0) {
      UI.renderNoResults();
    } else {
      const sorted = sortCars(cars, sortSelect.value);
      UI.renderCars(sorted);
      UI.showResultsControls(cars.length);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // ORDENAÇÃO
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Ordena os carros conforme o critério selecionado.
   * Não modifica o array original — retorna uma cópia ordenada.
   *
   * @param {Array}  cars      - Array de carros
   * @param {string} sortType  - "default" | "price-asc" | "price-desc"
   * @returns {Array}
   */
  function sortCars(cars, sortType) {
    const copy = [...cars];

    if (sortType === "price-asc") {
      // Carros com preço vêm primeiro; "Sob consulta" vai ao final
      copy.sort((a, b) => {
        const pa = a.price_value ?? Infinity;
        const pb = b.price_value ?? Infinity;
        return pa - pb;
      });
    } else if (sortType === "price-desc") {
      copy.sort((a, b) => {
        const pa = a.price_value ?? -Infinity;
        const pb = b.price_value ?? -Infinity;
        return pb - pa;
      });
    }
    // "default" → mantém a ordem de chegada da API

    // Sempre garante que os carros da própria empresa (ZM Veículos) fiquem no topo
    copy.sort((a, b) => {
      const aIsZM = a.dealer_name === "ZM Veículos";
      const bIsZM = b.dealer_name === "ZM Veículos";
      if (aIsZM && !bIsZM) return -1;
      if (!aIsZM && bIsZM) return 1;
      return 0; // se ambos forem ZM ou nenhum for, mantém a ordem prévia
    });

    return copy;
  }

  // ══════════════════════════════════════════════════════════════════════
  // EXPORTAR CSV
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Gera e baixa um arquivo CSV com os resultados da busca atual.
   * Colunas: Título, Preço, Revenda, Link do Anúncio, URL da Imagem
   *
   * @param {Array} cars - Array de carros retornados pela API
   */
  function exportToCsv(cars) {
    const query = searchInput.value.trim() || "busca";
    const date  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Cabeçalho
    const headers = ["Título", "Preço", "Revenda", "Link do Anúncio", "URL da Imagem"];

    // Linhas
    const rows = cars.map(car => [
      csvCell(car.title       || ""),
      csvCell(car.price       || ""),
      csvCell(car.dealer_name || ""),
      csvCell(car.url         || ""),
      csvCell(car.image_url   || ""),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(","))
      .join("\r\n");

    // BOM para garantir acentos no Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href     = url;
    link.download = `autobusca_${query}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Escapa um valor para uso em célula CSV:
   * envolve em aspas duplas e escapa aspas internas.
   * @param {string} value
   * @returns {string}
   */
  function csvCell(value) {
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  }

  // ══════════════════════════════════════════════════════════════════════
  // TEMA
  // ══════════════════════════════════════════════════════════════════════

  function handleThemeToggle() {
    const body = document.body;
    const isDark = body.classList.contains("dark-theme");
    const newTheme = isDark ? "light" : "dark";

    body.classList.remove("dark-theme", "light-theme");
    body.classList.add(`${newTheme}-theme`);
    Storage.saveTheme(newTheme);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PAINEL DE URLs
  // ══════════════════════════════════════════════════════════════════════

  function toggleUrlsPanel() {
    const isOpen = urlsPanel.classList.toggle("is-open");
    urlsPanel.setAttribute("aria-expanded", isOpen);
  }

  function handleSaveUrls() {
    const urls = Storage.parseUrlText(urlsTextarea.value);
    Storage.saveUrls(urls);
    updateUrlsCount(urls.length);
    showSavedNotice();
  }

  function handleClearUrls() {
    urlsTextarea.value = "";
    Storage.saveUrls([]);
    updateUrlsCount(0);
  }

  function handleLoadDefaults() {
    const defaults = Storage.getDefaultUrls();
    urlsTextarea.value = Storage.urlsToText(defaults);
    updateUrlsCount(defaults.length);
    // Abre o painel automaticamente para o usuário ver o que foi carregado
    if (!urlsPanel.classList.contains("is-open")) {
      toggleUrlsPanel();
    }
  }

  /**
   * Atualiza o badge de contagem no cabeçalho do painel.
   * @param {number} count
   */
  function updateUrlsCount(count) {
    urlsCount.textContent = count;
  }

  /**
   * Exibe a mensagem "✓ Salvo!" por 2 segundos.
   */
  function showSavedNotice() {
    urlsSavedNotice.classList.add("visible");
    setTimeout(() => urlsSavedNotice.classList.remove("visible"), 2000);
  }

  // ══════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Alterna o estado visual do botão de busca entre "normal" e "carregando".
   * @param {boolean} loading
   */
  function setSearchLoading(loading) {
    searchBtn.disabled  = loading;
    searchInput.disabled = loading;
    searchBtn.textContent = loading ? "Buscando..." : "Buscar";
  }

  // ── Inicializa tudo ao carregar ─────────────────────────────────────
  init();

});
