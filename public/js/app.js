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
  let activeEventSource = null; // Instância de EventSource ativa para streaming
  let fipePriceRef = null; // Preço FIPE de referência para comparação
  let fipeModelRef = null; // Nome do modelo FIPE de referência
  let activeCompareCars = []; // Veículos selecionados para comparação
  let activeCompareUrls = new Set(); // URLs dos veículos selecionados para comparação

  // ── Estado global da Fase 2 (Supabase) ──────────────────────────────────
  let currentTab = "search"; // "search" ou "inventory"
  let currentUser = null; // Informações do usuário logado
  let inventoryPage = 0;
  let inventoryTotal = 0;
  let inventoryHasMore = true;
  let isLoadingInventory = false;
  const inventoryLimit = 24;


  // ── Elementos do DOM ───────────────────────────────────────────────────
  const searchForm     = document.getElementById("search-form");
  const searchInput    = document.getElementById("search-input");
  const searchBtn      = document.getElementById("search-btn");
  const uploadImgBtn   = document.getElementById("upload-img-btn");
  const imageUploadInput = document.getElementById("image-upload-input");
  const imageAnalysisOverlay = document.getElementById("image-analysis-overlay");
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

  // Elementos do painel de filtros
  const filtersSidebar = document.getElementById("filters-sidebar");
  const btnToggleFilters = document.getElementById("btn-toggle-filters");
  const btnCloseFilters = document.getElementById("btn-close-filters");
  const filterDealers = document.getElementById("filter-dealers");
  const filterPriceRange = document.getElementById("filter-price-range");
  const priceFilterValue = document.getElementById("price-filter-value");
  const filterYearMin = document.getElementById("filter-year-min");
  const filterKmRange = document.getElementById("filter-km-range");
  const kmFilterValue = document.getElementById("km-filter-value");
  const btnClearFilters = document.getElementById("btn-clear-filters");

  // Elementos do Modo Comparação
  const compareFloatingBar = document.getElementById("compare-floating-bar");
  const compareBarCount = document.getElementById("compare-bar-count");
  const btnCompareNow = document.getElementById("btn-compare-now");
  const btnClearCompareSelection = document.getElementById("btn-clear-compare-selection");
  const compareModal = document.getElementById("compare-modal");
  const compareTable = document.getElementById("compare-table");
  const btnCloseCompareModal = document.getElementById("btn-close-compare-modal");

  // Elementos do Modo de Visualização (Grade/Lista)
  const btnViewGrid = document.getElementById("btn-view-grid");
  const btnViewList = document.getElementById("btn-view-list");
  const resultsGrid = document.getElementById("results-grid");
  const voiceSearchBtn = document.getElementById("voice-search-btn");

  // Elementos do Mini-mapa
  const mapPanel = document.getElementById("map-panel");
  const mapPanelToggle = document.getElementById("map-panel-toggle");

  // Elementos do Grupo 4 (Supabase)
  const navBtnSearch = document.getElementById("nav-btn-search");
  const navBtnInventory = document.getElementById("nav-btn-inventory");
  const authMenuWrapper = document.getElementById("auth-menu-wrapper");
  const btnLoginTrigger = document.getElementById("btn-login-trigger");
  const userDropdown = document.getElementById("user-dropdown");
  const userEmailDisplay = document.getElementById("user-email-display");
  const btnShowAlerts = document.getElementById("btn-show-alerts");
  const btnAdminSync = document.getElementById("btn-admin-sync");
  const btnLogout = document.getElementById("btn-logout");
  const loginModal = document.getElementById("login-modal");
  const btnCloseLoginModal = document.getElementById("btn-close-login-modal");
  const authOfflineBadge = document.getElementById("auth-offline-badge");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const btnAuthSubmit = document.getElementById("btn-auth-submit");
  const btnAuthToggle = document.getElementById("btn-auth-toggle");
  const authErrorMsg = document.getElementById("auth-error-msg");
  const alertsModal = document.getElementById("alerts-modal");
  const btnCloseAlertsModal = document.getElementById("btn-close-alerts-modal");
  const alertsListWrapper = document.getElementById("alerts-list-wrapper");
  const historyModal = document.getElementById("history-modal");
  const btnCloseHistoryModal = document.getElementById("btn-close-history-modal");
  const historyCarTitle = document.getElementById("history-car-title");
  const historyCarDealer = document.getElementById("history-car-dealer");
  const historyChartWrapper = document.getElementById("history-chart-wrapper");
  const historyTableBody = document.getElementById("history-table-body");
  const createAlertModal = document.getElementById("create-alert-modal");
  const btnCloseCreateAlert = document.getElementById("btn-close-create-alert");
  const createAlertForm = document.getElementById("create-alert-form");
  const alertEmailInput = document.getElementById("alert-email-input");
  const alertTargetPrice = document.getElementById("alert-target-price");
  const alertVehicleUrl = document.getElementById("alert-vehicle-url");
  const alertVehicleTitle = document.getElementById("alert-vehicle-title");
  const adminSyncModal = document.getElementById("admin-sync-modal");
  const btnCloseAdminSync = document.getElementById("btn-close-admin-sync");
  const btnSyncAllDealers = document.getElementById("btn-sync-all-dealers");
  const dealersSyncList = document.getElementById("dealers-sync-list");
  const filterBrand = document.getElementById("filter-brand");

  // Meu Estoque Refs
  const btnMyStock = document.getElementById("btn-my-stock");
  const myStockModal = document.getElementById("my-stock-modal");
  const btnCloseMyStock = document.getElementById("btn-close-my-stock");
  const myStockListView = document.getElementById("my-stock-list-view");
  const btnNewStockCar = document.getElementById("btn-new-stock-car");
  const myStockListContainer = document.getElementById("my-stock-list-container");
  const myStockFormView = document.getElementById("my-stock-form-view");
  const btnBackStockList = document.getElementById("btn-back-stock-list");
  const myStockForm = document.getElementById("my-stock-form");

  // ══════════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ══════════════════════════════════════════════════════════════════════

  function init() {
    loadThemePreference();
    loadSavedUrls();
    loadViewPreference();
    initMapPanel();
    bindEvents();
    initFilters();
    checkUrlParams();
    initTabs();
    initAuth();
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

    // Busca por imagem
    if (uploadImgBtn && imageUploadInput) {
      uploadImgBtn.addEventListener("click", () => imageUploadInput.click());
      imageUploadInput.addEventListener("change", handleImageUploadChange);
    }

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
        const enriched = enrichCarsWithFipe(allCars);
        const sorted = sortCars(enriched, sortSelect.value);
        UI.renderCars(sorted, activeCompareUrls);
      }
    });

    // Exportar CSV
    btnExportCsv.addEventListener("click", () => {
      if (allCars.length > 0) exportToCsv(allCars);
    });

    // Lógica do Modo Comparação Lado a Lado
    const resultsGrid = document.getElementById("results-grid");
    if (resultsGrid) {
      resultsGrid.addEventListener("change", handleCompareCheckboxChange);
    }
    if (btnCompareNow) {
      btnCompareNow.addEventListener("click", openCompareModal);
    }
    if (btnClearCompareSelection) {
      btnClearCompareSelection.addEventListener("click", clearCompareSelection);
    }
    if (btnCloseCompareModal) {
      btnCloseCompareModal.addEventListener("click", closeCompareModal);
    }
    if (compareModal) {
      compareModal.addEventListener("click", (e) => {
        if (e.target === compareModal) {
          closeCompareModal();
        }
      });
    }

    // Alternância de visualização (Grade/Lista)
    if (btnViewGrid && btnViewList) {
      btnViewGrid.addEventListener("click", () => {
        applyViewLayout("grid");
        Storage.saveView("grid");
      });
      btnViewList.addEventListener("click", () => {
        applyViewLayout("list");
        Storage.saveView("list");
      });
    }

    // Busca por Voz
    if (voiceSearchBtn) {
      initVoiceSearch();
    }

    // Grid Delegation para Clicks de Histórico e Alerta (Grupo 4)
    if (resultsGrid) {
      resultsGrid.addEventListener("click", handleGridButtonClick);
    }

    // Scroll para Infinite Scroll (Grupo 4)
    window.addEventListener("scroll", handleScroll);
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

    if (currentTab === "inventory") {
      inventoryPage = 0;
      inventoryHasMore = true;
      await fetchInventoryResults();
      return;
    }

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
   * Trata a seleção de arquivo de imagem para busca.
   */
  function handleImageUploadChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Garante que é uma imagem
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido.");
      imageUploadInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(",")[1];
      const mimeType = file.type;

      // Exibe overlay de análise de imagem
      if (imageAnalysisOverlay) {
        imageAnalysisOverlay.classList.remove("hidden");
      }

      try {
        const res = await fetch("/api/buscar-imagem", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image: base64Data,
            mimeType: mimeType
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Erro de rede ${res.status}`);
        }

        const data = await res.json();
        
        // Sucesso! Esconde overlay, preenche campo de busca e envia o formulário
        if (imageAnalysisOverlay) {
          imageAnalysisOverlay.classList.add("hidden");
        }

        if (data.query) {
          searchInput.value = data.query;
          // Dispara busca
          searchForm.dispatchEvent(new Event("submit"));
        } else {
          throw new Error("Modelo não identificado pela IA.");
        }

      } catch (err) {
        console.error("Erro ao analisar imagem:", err);
        alert(`Erro ao analisar imagem: ${err.message}`);
        if (imageAnalysisOverlay) {
          imageAnalysisOverlay.classList.add("hidden");
        }
      } finally {
        // Limpa o input para permitir re-upload do mesmo arquivo
        imageUploadInput.value = "";
      }
    };

    reader.onerror = (err) => {
      console.error("Erro ao ler arquivo:", err);
      alert("Erro ao ler o arquivo de imagem.");
      imageUploadInput.value = "";
    };

    reader.readAsDataURL(file);
  }

  async function runSearch(query, urls) {
    isSearching = true;

    // Cancela busca anterior se ainda estiver rodando
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }

    // ── Prepara a UI para o estado de carregamento ──
    setSearchLoading(true);
    UI.showSkeletons(6);
    UI.hideResultsControls();
    if (filtersSidebar) filtersSidebar.classList.add("hidden");
    if (btnToggleFilters) btnToggleFilters.classList.add("hidden");

    allCars = [];
    clearCompareSelection();
    const controller = new AbortController();
    let gotCache = false;

    // Timeout de 1.2 segundos para a busca rápida no cache (GET)
    const cacheTimeout = setTimeout(() => {
      if (!gotCache) {
        controller.abort(); // Cancela a requisição GET lenta
        startStreamingSearch(query, urls); // Fallback para streaming em tempo real
      }
    }, 1200);

    try {
      const data = await Api.buscarCarros(query, controller.signal);
      clearTimeout(cacheTimeout);
      gotCache = true;

      // Se respondeu rápido (Cache HIT ou STALE no Edge/Browser), exibe na hora!
      allCars = data.results || [];
      finishSearch(allCars, query);
    } catch (err) {
      clearTimeout(cacheTimeout);

      // Se o erro for de Abort (devido ao timeout do cache), ignoramos pois o stream já iniciou.
      // Para qualquer outro erro de rede imediato, cai para o stream como fallback.
      if (err.name !== "AbortError" && !gotCache) {
        console.warn("[AutoBusca] Falha ao ler cache, iniciando streaming:", err);
        startStreamingSearch(query, urls);
      }
    }
  }

  /**
   * Dispara a busca em tempo real via streaming (SSE).
   */
  function startStreamingSearch(query, urls) {
    let processedCount = 0;
    let totalSites = urls.length || 1;

    UI.showProgress(totalSites);

    activeEventSource = Api.buscarCarrosStream(query, {
      onInit: (data) => {
        const sites = data.sites || [];
        totalSites = sites.length;
        UI.showProgress(totalSites);
        sites.forEach(site => {
          UI.updateStoreBadge(site.name, "waiting", "Aguardando...");
        });
      },
      onSiteResult: (data) => {
        processedCount++;
        UI.setProgressBar(processedCount, totalSites, `Processando: ${data.name}`);
        UI.updateStoreBadge(
          data.name,
          data.status,
          data.status === "error"
            ? `Erro: ${data.error || "falha"}`
            : `${data.count} enc.`
        );

        if (data.status === "success" && data.results && data.results.length > 0) {
          allCars = allCars.concat(data.results);
          const enriched = enrichCarsWithFipe(allCars);
          const sorted = sortCars(enriched, sortSelect.value);
          UI.renderCars(sorted, activeCompareUrls);
          UI.showResultsControls(allCars.length);
        }
      },
      onDone: () => {
        activeEventSource = null;
        finishSearch(allCars, query);
      },
      onError: (err) => {
        activeEventSource = null;
        console.error("[AutoBusca] Erro no streaming de resultados:", err);
        if (allCars.length === 0) {
          UI.hideProgress();
          UI.renderError("Erro na conexão com o servidor de streaming. Tente novamente.");
          setSearchLoading(false);
          isSearching = false;
        } else {
          finishSearch(allCars, query);
        }
      }
    });
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
      if (filtersSidebar) filtersSidebar.classList.add("hidden");
      if (btnToggleFilters) btnToggleFilters.classList.add("hidden");
      updateMapMarkersState(new Set());
    } else {
      populateFiltersData(cars);
      resetFiltersUI();
      const enriched = enrichCarsWithFipe(cars);
      const sorted = sortCars(enriched, sortSelect.value);
      UI.renderCars(sorted, activeCompareUrls);
      UI.showResultsControls(cars.length);
      updateMapMarkersState(new Set(cars.map(c => c.dealer_name)));
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

  /**
   * Enriquece a lista de carros com dados de comparação da FIPE se houver referência.
   * @param {Array} cars 
   * @returns {Array}
   */
  function enrichCarsWithFipe(cars) {
    return cars.map(car => {
      if (fipePriceRef && car.price_value && car.price_value > 0) {
        const diff = car.price_value - fipePriceRef;
        const percent = (diff / fipePriceRef) * 100;
        return {
          ...car,
          comparison: { diff, percent }
        };
      } else {
        // Remove comparison if not matching/active
        const { comparison, ...rest } = car;
        return rest;
      }
    });
  }

  /**
   * Verifica se há parâmetros de busca e FIPE na URL e inicializa o estado de comparação.
   */
  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    const fipePrice = urlParams.get("fipe_price");
    const fipeName = urlParams.get("fipe_name");

    if (fipePrice && fipeName) {
      fipePriceRef = parseFloat(fipePrice);
      fipeModelRef = decodeURIComponent(fipeName);

      if (!isNaN(fipePriceRef)) {
        const formatted = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0
        }).format(fipePriceRef);

        UI.showFipeCompareBanner(fipeModelRef, formatted, handleClearFipeCompare);
      }
    }

    if (query) {
      searchInput.value = decodeURIComponent(query);
      const urlsText = urlsTextarea.value;
      const urls = Storage.parseUrlText(urlsText);
      runSearch(searchInput.value, urls);
    }
  }

  /**
   * Limpa o estado de comparação da FIPE, atualiza a URL e re-renderiza.
   */
  function handleClearFipeCompare() {
    fipePriceRef = null;
    fipeModelRef = null;

    UI.hideFipeCompareBanner();

    // Atualiza a URL para remover os parâmetros da FIPE sem recarregar
    const url = new URL(window.location);
    url.searchParams.delete("fipe_price");
    url.searchParams.delete("fipe_name");
    url.searchParams.delete("fipe_code");
    window.history.replaceState({}, "", url);

    // Re-renderiza a lista atual sem os badges de FIPE
    if (allCars.length > 0) {
      const enriched = enrichCarsWithFipe(allCars);
      const sorted = sortCars(enriched, sortSelect.value);
      UI.renderCars(sorted, activeCompareUrls);
    }
  }

  // ── Painel de Filtros Laterais ──────────────────────────────────────
  let sidebarOverlay = null;

  function initFilters() {
    // Cria o overlay no body para fechar os filtros no mobile ao clicar fora
    sidebarOverlay = document.createElement("div");
    sidebarOverlay.className = "sidebar-overlay";
    document.body.appendChild(sidebarOverlay);

    // Eventos de abrir/fechar filtros no mobile
    if (btnToggleFilters) {
      btnToggleFilters.addEventListener("click", () => {
        filtersSidebar.classList.add("is-open");
        sidebarOverlay.classList.add("active");
      });
    }

    if (btnCloseFilters) {
      btnCloseFilters.addEventListener("click", closeMobileFilters);
    }

    sidebarOverlay.addEventListener("click", closeMobileFilters);

    // Eventos de alteração dos inputs de filtros
    if (filterPriceRange) {
      filterPriceRange.addEventListener("input", handlePriceFilterChange);
    }
    if (filterKmRange) {
      filterKmRange.addEventListener("input", handleKmFilterChange);
    }
    if (filterYearMin) {
      filterYearMin.addEventListener("change", applyFilters);
    }
    if (filterBrand) {
      filterBrand.addEventListener("change", applyFilters);
    }
    if (btnClearFilters) {
      btnClearFilters.addEventListener("click", resetFilters);
    }
  }

  function closeMobileFilters() {
    if (filtersSidebar) filtersSidebar.classList.remove("is-open");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");
  }

  function handlePriceFilterChange() {
    const val = parseInt(filterPriceRange.value);
    const maxVal = parseInt(filterPriceRange.max);
    if (val === maxVal) {
      priceFilterValue.textContent = "Qualquer valor";
    } else {
      priceFilterValue.textContent = `Até ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val)}`;
    }
    applyFilters();
  }

  function handleKmFilterChange() {
    const val = parseInt(filterKmRange.value);
    const maxVal = parseInt(filterKmRange.max);
    if (val === maxVal) {
      kmFilterValue.textContent = "Qualquer KM";
    } else {
      kmFilterValue.textContent = `Até ${val.toLocaleString("pt-BR")} km`;
    }
    applyFilters();
  }

  function populateFiltersData(cars) {
    if (cars.length === 0) {
      filtersSidebar.classList.add("hidden");
      if (btnToggleFilters) btnToggleFilters.classList.add("hidden");
      return;
    }

    // Exibe a sidebar e o botão
    filtersSidebar.classList.remove("hidden");
    if (btnToggleFilters) btnToggleFilters.classList.remove("hidden");

    // 1. Popula Revendas
    const dealers = [...new Set(cars.map(c => c.dealer_name))].sort();
    
    // Captura as revendas marcadas anteriormente para não perder seleção
    const previouslyChecked = new Set();
    filterDealers.querySelectorAll("input[type='checkbox']:checked").forEach(cb => {
      previouslyChecked.add(cb.value);
    });
    
    filterDealers.innerHTML = "";
    dealers.forEach(dealer => {
      // Se não havia nada marcado anteriormente (nova busca), marca tudo por padrão
      const isChecked = previouslyChecked.size === 0 || previouslyChecked.has(dealer);
      
      const label = document.createElement("label");
      label.className = "filter-checkbox-label";
      label.innerHTML = `
        <input type="checkbox" value="${dealer}" ${isChecked ? "checked" : ""}>
        <span>${dealer}</span>
      `;
      filterDealers.appendChild(label);
      
      label.querySelector("input").addEventListener("change", applyFilters);
    });

    // 2. Popula Anos
    const years = [];
    cars.forEach(c => {
      if (c.year) {
        const match = c.year.match(/\d{4}/);
        if (match) {
          const y = parseInt(match[0]);
          if (!isNaN(y)) years.push(y);
        }
      }
    });
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

    const previousYear = filterYearMin.value;
    filterYearMin.innerHTML = '<option value="all">Qualquer ano</option>';
    uniqueYears.forEach(y => {
      const option = document.createElement("option");
      option.value = y;
      option.textContent = `${y} ou mais novo`;
      if (y.toString() === previousYear) {
        option.selected = true;
      }
      filterYearMin.appendChild(option);
    });
  }

  function applyFilters() {
    if (currentTab === "inventory") {
      inventoryPage = 0;
      inventoryHasMore = true;
      fetchInventoryResults();
      return;
    }

    if (allCars.length === 0) return;

    // 1. Coleciona filtros selecionados
    const checkedDealers = new Set();
    filterDealers.querySelectorAll("input[type='checkbox']:checked").forEach(cb => {
      checkedDealers.add(cb.value);
    });

    const maxPrice = parseInt(filterPriceRange.value);
    const maxPriceLimit = parseInt(filterPriceRange.max);

    const minYearVal = filterYearMin.value;
    const minYear = minYearVal === "all" ? null : parseInt(minYearVal);

    const maxKm = parseInt(filterKmRange.value);
    const maxKmLimit = parseInt(filterKmRange.max);

    // 2. Aplica os filtros sobre a lista original
    const filteredCars = allCars.filter(car => {
      // Filtro de revenda
      if (checkedDealers.size > 0 && !checkedDealers.has(car.dealer_name)) {
        return false;
      }

      // Filtro de preço
      if (maxPrice < maxPriceLimit) {
        if (car.price_value && car.price_value > maxPrice) {
          return false;
        }
      }

      // Filtro de ano
      if (minYear) {
        if (car.year) {
          const match = car.year.match(/\d{4}/);
          const carYear = match ? parseInt(match[0]) : null;
          if (carYear && carYear < minYear) {
            return false;
          }
        }
      }

      // Filtro de KM
      if (maxKm < maxKmLimit) {
        if (car.km) {
          const cleanKM = car.km.replace(/[^\d]/g, "");
          const carKmValue = parseInt(cleanKM);
          if (!isNaN(carKmValue) && carKmValue > maxKm) {
            return false;
          }
        }
      }

      return true;
    });

    // 3. Renderiza os cards filtrados
    const enriched = enrichCarsWithFipe(filteredCars);
    const sorted = sortCars(enriched, sortSelect.value);
    
    if (sorted.length === 0) {
      UI.renderNoResultsFiltered();
      updateMapMarkersState(new Set());
    } else {
      UI.renderCars(sorted, activeCompareUrls);
      updateMapMarkersState(new Set(filteredCars.map(c => c.dealer_name)));
    }
    
    UI.updateResultsCount(sorted.length);
  }

  function resetFilters() {
    if (filterPriceRange) {
      filterPriceRange.value = filterPriceRange.max;
      priceFilterValue.textContent = "Qualquer valor";
    }
    if (filterKmRange) {
      filterKmRange.value = filterKmRange.max;
      kmFilterValue.textContent = "Qualquer KM";
    }
    if (filterYearMin) {
      filterYearMin.value = "all";
    }
    if (filterBrand) {
      filterBrand.value = "all";
    }
    
    if (filterDealers) {
      filterDealers.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.checked = true;
      });
    }

    applyFilters();
  }

  function resetFiltersUI() {
    if (filterPriceRange) {
      filterPriceRange.value = filterPriceRange.max;
      priceFilterValue.textContent = "Qualquer valor";
    }
    if (filterKmRange) {
      filterKmRange.value = filterKmRange.max;
      kmFilterValue.textContent = "Qualquer KM";
    }
    if (filterYearMin) {
      filterYearMin.value = "all";
    }
  }

  // ── Funções do Modo Comparação Lado a Lado ──────────────────────────
  function handleCompareCheckboxChange(e) {
    if (!e.target.classList.contains("compare-checkbox")) return;

    const url = e.target.getAttribute("data-car-url");
    if (!url) return;

    if (e.target.checked) {
      if (activeCompareCars.length >= 3) {
        alert("Você pode selecionar no máximo 3 veículos para comparação.");
        e.target.checked = false;
        return;
      }
      
      const car = allCars.find(c => c.url === url);
      if (car) {
        const enrichedList = enrichCarsWithFipe([car]);
        activeCompareCars.push(enrichedList[0]);
        activeCompareUrls.add(url);
      }
    } else {
      activeCompareCars = activeCompareCars.filter(c => c.url !== url);
      activeCompareUrls.delete(url);
    }

    updateCompareFloatingBar();
  }

  function updateCompareFloatingBar() {
    if (!compareFloatingBar || !compareBarCount || !btnCompareNow) return;

    const count = activeCompareCars.length;
    compareBarCount.textContent = `${count}/3`;

    if (count > 0) {
      compareFloatingBar.classList.remove("hidden");
    } else {
      compareFloatingBar.classList.add("hidden");
    }

    if (count >= 2) {
      btnCompareNow.disabled = false;
    } else {
      btnCompareNow.disabled = true;
    }
  }

  function clearCompareSelection() {
    activeCompareCars = [];
    activeCompareUrls.clear();
    updateCompareFloatingBar();
    
    const checkboxes = document.querySelectorAll(".compare-checkbox");
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
  }

  function openCompareModal() {
    if (!compareModal || !compareTable) return;
    
    compareTable.innerHTML = generateCompareTableHtml();
    compareModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeCompareModal() {
    if (!compareModal) return;
    compareModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function generateCompareTableHtml() {
    if (activeCompareCars.length === 0) return "";

    const rows = [
      { label: "Foto", field: "image" },
      { label: "Modelo", field: "title" },
      { label: "Preço", field: "price" },
      { label: "Revenda", field: "dealer" },
      { label: "Ano", field: "year" },
      { label: "Quilometragem", field: "km" },
      { label: "Ações", field: "actions" }
    ];

    let html = "";

    rows.forEach(row => {
      html += `<tr>`;
      html += `<th>${row.label}</th>`;

      activeCompareCars.forEach(car => {
        html += `<td>`;
        if (row.field === "image") {
          const fallbackImg = `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
              <rect width="300" height="200" fill="#1e2a40"/>
              <text x="150" y="85"  text-anchor="middle" fill="#4a5568" font-family="sans-serif" font-size="42">🚗</text>
              <text x="150" y="125" text-anchor="middle" fill="#4a5568" font-family="sans-serif" font-size="14">Sem foto disponível</text>
            </svg>
          `)}`;
          const imgSrc = car.image_url && car.image_url.startsWith("http") ? car.image_url : fallbackImg;
          html += `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(car.title)}" class="compare-td-img" onerror="this.onerror=null; this.src='${fallbackImg}';">`;
        } else if (row.field === "title") {
          html += `<div class="compare-td-title">${escapeHtml(car.title)}</div>`;
        } else if (row.field === "price") {
          let priceHtml = `<div class="compare-td-price">${escapeHtml(car.price || "Sob consulta")}</div>`;
          if (car.comparison) {
            const isBelow = car.comparison.diff < 0;
            const absDiff = Math.abs(car.comparison.diff);
            const formattedDiff = new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0
            }).format(absDiff);
            const percentStr = `${Math.abs(car.comparison.percent).toFixed(1)}%`;
            priceHtml += `
              <div class="fipe-card-badge ${isBelow ? 'below' : 'above'}" style="margin: 4px auto 0; font-size: 0.7rem; width: fit-content;" title="Preço em relação à tabela FIPE de referência">
                ${isBelow ? '▼' : '▲'} ${formattedDiff} (${percentStr})
              </div>
            `;
          }
          html += priceHtml;
        } else if (row.field === "dealer") {
          html += `<div class="compare-td-dealer">${escapeHtml(car.dealer_name || "Revenda")}</div>`;
        } else if (row.field === "year") {
          html += `<div>${escapeHtml(car.year || "Não informado")}</div>`;
        } else if (row.field === "km") {
          html += `<div>${escapeHtml(car.km || "Não informado")}</div>`;
        } else if (row.field === "actions") {
          let fipePriceParam = "";
          if (car.comparison && car.price_value) {
            const fipePriceVal = car.price_value - car.comparison.diff;
            fipePriceParam = `&fipe_price=${fipePriceVal}`;
          }
          const detailsUrl = `detalhes.html?title=${encodeURIComponent(car.title)}` +
            `&price=${encodeURIComponent(car.price || "")}` +
            `&price_value=${car.price_value || ""}` +
            `&img=${encodeURIComponent(car.image_url || "")}` +
            `&url=${encodeURIComponent(car.url)}` +
            `&dealer=${encodeURIComponent(car.dealer_name || "")}` +
            `${car.year ? `&year=${encodeURIComponent(car.year)}` : ""}` +
            `${car.km ? `&km=${encodeURIComponent(car.km)}` : ""}` +
            fipePriceParam;

          html += `
            <div class="compare-td-actions">
              <a href="${detailsUrl}" class="btn-compare-action-view">Ver Detalhes</a>
              <a href="${escapeHtml(car.url)}" target="_blank" rel="noopener noreferrer" class="btn-compare-action-orig">Ver Original</a>
            </div>
          `;
        }
        html += `</td>`;
      });

      html += `</tr>`;
    });

    return html;
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ── Funções de visualização (Grade/Lista) ───────────────────────────
  function loadViewPreference() {
    const view = Storage.loadView();
    applyViewLayout(view);
  }

  function applyViewLayout(view) {
    if (!resultsGrid || !btnViewGrid || !btnViewList) return;

    if (view === "list") {
      resultsGrid.classList.add("view-list");
      btnViewList.classList.add("active");
      btnViewGrid.classList.remove("active");
    } else {
      resultsGrid.classList.remove("view-list");
      btnViewGrid.classList.add("active");
      btnViewList.classList.remove("active");
    }
  }

  // ── Funções da Busca por Voz ────────────────────────────────────────
  let speechRecognition = null;
  let isListeningVoice = false;

  function initVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Oculta o botão se não houver suporte à API no navegador
      if (voiceSearchBtn) voiceSearchBtn.style.display = "none";
      return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = "pt-BR";
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;

    voiceSearchBtn.addEventListener("click", () => {
      if (isListeningVoice) {
        speechRecognition.stop();
      } else {
        startVoiceRecognition();
      }
    });

    speechRecognition.onstart = () => {
      isListeningVoice = true;
      voiceSearchBtn.classList.add("listening");
      searchInput.placeholder = "Ouvindo... Fale o modelo";
      searchInput.focus();
    };

    speechRecognition.onend = () => {
      isListeningVoice = false;
      voiceSearchBtn.classList.remove("listening");
      searchInput.placeholder = "Digite o modelo (ex: Onix, Corolla 2022, HB20)...";
    };

    speechRecognition.onerror = (e) => {
      console.error("[SpeechRecognition Error]:", e.error);
      isListeningVoice = false;
      voiceSearchBtn.classList.remove("listening");
      searchInput.placeholder = "Digite o modelo (ex: Onix, Corolla 2022, HB20)...";
      
      if (e.error === "not-allowed") {
        alert("Permissão para microfone negada. Ative nas configurações do navegador.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        alert("Erro no reconhecimento de voz: " + e.error);
      }
    };

    speechRecognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        searchInput.value = transcript.trim();
        // Dispara a busca submetendo o formulário automaticamente
        searchForm.dispatchEvent(new Event("submit"));
      }
    };
  }

  // ── Funções de visualização (Grade/Lista) ───────────────────────────
  function loadViewPreference() {
    const view = Storage.loadView();
    applyViewLayout(view);
  }

  function applyViewLayout(view) {
    if (!resultsGrid || !btnViewGrid || !btnViewList) return;

    if (view === "list") {
      resultsGrid.classList.add("view-list");
      btnViewList.classList.add("active");
      btnViewGrid.classList.remove("active");
    } else {
      resultsGrid.classList.remove("view-list");
      btnViewGrid.classList.add("active");
      btnViewList.classList.remove("active");
    }
  }

  // ── Funções do Mini-mapa de Revendas ────────────────────────────────
  const DEALER_COORDINATES = {
    "ZM Veículos": { lat: -21.2335, lng: -47.8545 },
    "AMF Veículos": { lat: -21.2336, lng: -47.8546 },
    "Savinho Motors": { lat: -21.2046129, lng: -47.7752232 },
    "Ramiro Veículos": { lat: -21.1730, lng: -47.8020 },
    "GL Veículos": { lat: -21.2050721, lng: -47.7720125 },
    "Auto Prime RP": { lat: -21.1592993, lng: -47.8083764 },
    "KR Veículos": { lat: -21.1879399, lng: -47.7953239 },
    "Base Veículos": { lat: -21.2119737, lng: -47.7787608 },
    "MM Veículos": { lat: -21.1875093, lng: -47.7920205 },
    "Valvech Veículos": { lat: -21.1931872, lng: -47.8215016 },
    "Copa Veículos": { lat: -21.2026171, lng: -47.7949258 },
    "Auto Mais Veículos": { lat: -21.1749196, lng: -47.8035016 },
    "Rossi Veículos": { lat: -21.1649642, lng: -47.8196494 },
    "Seminovos Ribeirão": { lat: -21.1882983, lng: -47.8295508 },
    "TCA Motors": { lat: -21.1869835, lng: -47.8127694 },
    "Holf Autos": { lat: -21.2142596, lng: -47.8287652 },
    "Bolsa de Veículo": { lat: -21.1771842, lng: -47.8015926 },
    "Cristal Veículos": { lat: -21.1718389, lng: -47.8071746 },
    "Lexcar Multimarcas": { lat: -21.1502876, lng: -47.8018683 },
    "San Diego Veículos": { lat: -21.2079473, lng: -47.7904259 },
    "Hiperauto": { lat: -21.164672, lng: -47.788591 },
    "Tharley Veículos": { lat: -21.1699057, lng: -47.8098209 },
    "Mix Veículos": { lat: -21.1513578, lng: -47.825274 },
    "Kito Veículos": { lat: -21.1633785, lng: -47.7894561 },
    "Cem Veículos": { lat: -21.1718389, lng: -47.8071746 }
  };

  let leafletMap = null;
  let mapMarkers = {};
  let isMapInitialized = false;

  function initMapPanel() {
    if (mapPanelToggle && mapPanel) {
      mapPanelToggle.addEventListener("click", toggleMapPanel);
      mapPanelToggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleMapPanel();
        }
      });
    }
  }

  function toggleMapPanel() {
    if (!mapPanel || !mapPanelToggle) return;
    
    const isCollapsed = mapPanel.classList.toggle("collapsed");
    mapPanelToggle.setAttribute("aria-expanded", !isCollapsed);

    if (!isCollapsed) {
      if (!isMapInitialized) {
        setupLeafletMap();
        isMapInitialized = true;
      } else if (leafletMap) {
        // Recalibra o layout do Leaflet para renderizar as partes do mapa
        setTimeout(() => {
          leafletMap.invalidateSize();
        }, 100);
      }
    }
  }

  function setupLeafletMap() {
    if (!document.getElementById("map-container")) return;

    // Inicializa o mapa centralizado em Ribeirão Preto
    leafletMap = L.map("map-container").setView([-21.1775, -47.8103], 13);

    // Adiciona camada do OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMap);

    // Cria pins para cada revenda
    Object.keys(DEALER_COORDINATES).forEach(name => {
      const coords = DEALER_COORDINATES[name];
      const marker = L.marker([coords.lat, coords.lng]);

      const popupHtml = `
        <div style="font-family: var(--font-body); font-size: 0.85rem; text-align: center;">
          <strong style="display: block; margin-bottom: 4px; color: var(--text-primary); font-size: 0.9rem;">${name}</strong>
          <a href="#" class="map-popup-filter-link" data-dealer="${name}" style="color: var(--accent); font-weight: 700; text-decoration: none;">Ver anúncios desta loja →</a>
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.addTo(leafletMap);

      mapMarkers[name] = marker;
    });

    // Escuta evento de abertura de popups para atrelar filtros rápidos
    leafletMap.on("popupopen", (e) => {
      const el = e.popup.getElement();
      if (!el) return;
      const link = el.querySelector(".map-popup-filter-link");
      if (link) {
        link.addEventListener("click", (evt) => {
          evt.preventDefault();
          const dealer = link.getAttribute("data-dealer");
          filterResultsByDealerOnly(dealer);
          e.popup.close();
        });
      }
    });

    // Se já existem ofertas no momento da abertura do mapa, atualiza as opacidades dos pins
    if (allCars.length > 0) {
      const activeSet = new Set(allCars.map(c => c.dealer_name));
      updateMapMarkersState(activeSet);
    }
  }

  function filterResultsByDealerOnly(dealer) {
    if (!filterDealers) return;
    
    // Marca apenas o checkbox correspondente no painel de filtros laterais
    filterDealers.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.checked = (cb.value === dealer);
    });
    
    // Aplica os filtros
    applyFilters();

    // Rola a página para os resultados de forma suave
    const resultsControls = document.getElementById("results-controls");
    if (resultsControls) {
      resultsControls.scrollIntoView({ behavior: "smooth" });
    }
  }

  function updateMapMarkersState(activeDealers = null) {
    if (!leafletMap || !isMapInitialized) return;

    Object.keys(mapMarkers).forEach(name => {
      const marker = mapMarkers[name];
      // Se não há dados ativos de busca, todos os marcadores ficam totalmente opacos (1.0).
      // Se há busca ativa, acentua os marcadores das revendas encontradas e esmaece as outras (0.35).
      if (!activeDealers || activeDealers.size === 0 || activeDealers.has(name)) {
        marker.setOpacity(1.0);
      } else {
        marker.setOpacity(0.35);
      }
    });
  }

  // ── TABS NAVEGAÇÃO (Fase 2) ───────────────────────────────────────────────
  function initTabs() {
    if (navBtnSearch && navBtnInventory) {
      navBtnSearch.addEventListener("click", () => switchTab("search"));
      navBtnInventory.addEventListener("click", () => switchTab("inventory"));
    }
  }

  async function switchTab(tab) {
    if (currentTab === tab) return;
    currentTab = tab;

    // Reseta filtros ao mudar de aba para evitar estados inconsistentes
    resetFilters();

    if (tab === "search") {
      navBtnSearch.classList.add("active");
      navBtnInventory.classList.remove("active");
      
      document.querySelector(".search-hero").classList.remove("hidden");
      urlsPanel.classList.remove("hidden");
      
      if (allCars.length > 0) {
        const enriched = enrichCarsWithFipe(allCars);
        const sorted = sortCars(enriched, sortSelect.value);
        UI.renderCars(sorted, activeCompareUrls);
        UI.showResultsControls(allCars.length);
      } else {
        els.resultsGrid().innerHTML = `
          <div class="empty-state" id="initial-state">
            <div class="empty-icon" aria-hidden="true">🚗</div>
            <h3>Seu buscador está pronto</h3>
            <p>Digite um termo acima e clique em Buscar para pesquisar em todas as revendas cadastradas simultaneamente.</p>
          </div>
        `;
        UI.hideResultsControls();
        if (filtersSidebar) filtersSidebar.classList.add("hidden");
        if (btnToggleFilters) btnToggleFilters.classList.add("hidden");
      }
    } else {
      navBtnInventory.classList.add("active");
      navBtnSearch.classList.remove("active");
      
      document.querySelector(".search-hero").classList.add("hidden");
      urlsPanel.classList.add("hidden");
      
      if (filtersSidebar) filtersSidebar.classList.remove("hidden");
      if (btnToggleFilters) btnToggleFilters.classList.remove("hidden");
      
      inventoryPage = 0;
      inventoryHasMore = true;
      isLoadingInventory = false;
      allCars = [];
      UI.showSkeletons(6);
      await fetchInventoryResults();
    }
  }

  async function fetchInventoryResults(append = false) {
    if (isLoadingInventory) return;
    isLoadingInventory = true;

    // Coleta checkboxes de revendas
    const checkedDealers = [];
    if (filterDealers) {
      filterDealers.querySelectorAll("input[type='checkbox']:checked").forEach(cb => {
        checkedDealers.push(cb.value);
      });
    }

    const filters = {
      dealer: checkedDealers.length === 1 ? checkedDealers[0] : "", // Filtro de revenda única
      brand: filterBrand ? filterBrand.value : "",
      minPrice: "",
      maxPrice: filterPriceRange ? filterPriceRange.value : "",
      minYear: filterYearMin ? filterYearMin.value : "",
      maxYear: "",
      minKm: "",
      maxKm: filterKmRange ? filterKmRange.value : "",
      search: searchInput.value.trim(),
      sort: sortSelect.value,
      limit: inventoryLimit,
      offset: inventoryPage * inventoryLimit
    };

    if (filters.brand === "all") filters.brand = "";
    if (filters.minYear === "all") filters.minYear = "";
    if (filters.maxPrice === "300000" || filters.maxPrice === "300000") filters.maxPrice = "";
    if (filters.maxKm === "200000" || filters.maxKm === "200000") filters.maxKm = "";

    try {
      const data = await Api.buscarEstoqueGeral(filters);
      if (data.offline) {
        window.isOfflineMode = true;
      }
      
      const cars = data.results || [];
      inventoryTotal = data.total || 0;
      inventoryHasMore = data.hasMore;

      if (append) {
        allCars = allCars.concat(cars);
      } else {
        allCars = cars;
      }

      const enriched = enrichCarsWithFipe(allCars);
      const sorted = sortCars(enriched, sortSelect.value);
      UI.renderCars(sorted, activeCompareUrls);
      UI.showResultsControls(inventoryTotal);
      
      const activeSet = new Set(allCars.map(c => c.dealer_name));
      updateMapMarkersState(activeSet);
      
    } catch (err) {
      console.error("Erro ao carregar estoque geral:", err);
      UI.renderError("Erro ao carregar o estoque geral do banco de dados.");
    } finally {
      isLoadingInventory = false;
    }
  }

  async function loadNextInventoryPage() {
    if (!inventoryHasMore || isLoadingInventory) return;
    inventoryPage++;
    await fetchInventoryResults(true);
  }

  function handleScroll() {
    if (currentTab !== "inventory") return;
    
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || window.pageYOffset;
    const clientHeight = window.innerHeight;

    if (scrollHeight - scrollTop - clientHeight < 150) {
      loadNextInventoryPage();
    }
  }

  // ── AUTENTICAÇÃO (Fase 2) ────────────────────────────────────────────────
  function initAuth() {
    const savedUser = localStorage.getItem("autobusca_user");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
      } catch (e) {
        localStorage.removeItem("autobusca_user");
      }
    }

    btnLoginTrigger.addEventListener("click", () => {
      if (currentUser) {
        userDropdown.classList.toggle("hidden");
      } else {
        openLoginModal();
      }
    });

    document.addEventListener("click", (e) => {
      if (!authMenuWrapper.contains(e.target)) {
        userDropdown.classList.add("hidden");
      }
    });

    btnCloseLoginModal.addEventListener("click", closeLoginModal);
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) closeLoginModal();
    });

    let authAction = "login";
    btnAuthToggle.addEventListener("click", () => {
      if (authAction === "login") {
        authAction = "signup";
        document.getElementById("login-modal-title").textContent = "Criar conta no AutoBusca";
        btnAuthSubmit.textContent = "Criar Conta";
        btnAuthToggle.textContent = "Já tenho uma conta. Entrar";
      } else {
        authAction = "login";
        document.getElementById("login-modal-title").textContent = "Entrar no AutoBusca";
        btnAuthSubmit.textContent = "Entrar";
        btnAuthToggle.textContent = "Criar uma conta";
      }
    });

    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      authErrorMsg.classList.add("hidden");
      btnAuthSubmit.disabled = true;
      btnAuthSubmit.textContent = authAction === "login" ? "Entrando..." : "Criando conta...";

      try {
        const data = await Api.auth(authAction, authEmail.value, authPassword.value);
        if (data.success && data.user) {
          currentUser = data.user;
          localStorage.setItem("autobusca_user", JSON.stringify(currentUser));
          updateAuthUI();
          closeLoginModal();
        } else {
          throw new Error("Erro na autenticação.");
        }
      } catch (err) {
        authErrorMsg.textContent = err.message || "Erro de login.";
        authErrorMsg.classList.remove("hidden");
      } finally {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.textContent = authAction === "login" ? "Entrar" : "Criar Conta";
      }
    });

    btnLogout.addEventListener("click", () => {
      currentUser = null;
      localStorage.removeItem("autobusca_user");
      updateAuthUI();
      userDropdown.classList.add("hidden");
    });

    btnShowAlerts.addEventListener("click", () => {
      userDropdown.classList.add("hidden");
      openAlertsModal();
    });
    btnCloseAlertsModal.addEventListener("click", () => alertsModal.classList.add("hidden"));
    
    btnAdminSync.addEventListener("click", () => {
      userDropdown.classList.add("hidden");
      openAdminSyncModal();
    });
    btnCloseAdminSync.addEventListener("click", () => adminSyncModal.classList.add("hidden"));

    // Meu Estoque
    if (btnMyStock) {
      btnMyStock.addEventListener("click", () => {
        userDropdown.classList.add("hidden");
        openMyStockModal();
      });
    }
    if (btnCloseMyStock) btnCloseMyStock.addEventListener("click", () => myStockModal.classList.add("hidden"));
    if (btnNewStockCar) {
      btnNewStockCar.addEventListener("click", () => {
        myStockForm.reset();
        document.getElementById("stock-id").value = "";
        document.getElementById("stock-form-title").textContent = "Novo Veículo";
        myStockListView.classList.add("hidden");
        myStockFormView.classList.remove("hidden");
      });
    }
    if (btnBackStockList) {
      btnBackStockList.addEventListener("click", () => {
        myStockFormView.classList.add("hidden");
        myStockListView.classList.remove("hidden");
      });
    }
    if (myStockForm) {
      myStockForm.addEventListener("submit", handleMyStockSubmit);
    }

    // Inicialização da criação de alertas
    btnCloseCreateAlert.addEventListener("click", () => createAlertModal.classList.add("hidden"));
    createAlertModal.addEventListener("click", (e) => {
      if (e.target === createAlertModal) createAlertModal.classList.add("hidden");
    });

    createAlertForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = alertEmailInput.value.trim();
      const targetPrice = parseFloat(alertTargetPrice.value) || 0;
      const url = alertVehicleUrl.value;
      
      try {
        await Api.criarAlerta(email, targetPrice, url);
        alert("Alerta de preço criado com sucesso!");
        createAlertModal.classList.add("hidden");
      } catch (err) {
        console.error(err);
        alert("Falha ao criar alerta de preço. Tente novamente.");
      }
    });
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    authErrorMsg.classList.add("hidden");
    authEmail.value = "";
    authPassword.value = "";
    
    if (window.isOfflineMode) {
      authOfflineBadge.classList.remove("hidden");
    } else {
      authOfflineBadge.classList.add("hidden");
    }
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
  }

  function updateAuthUI() {
    if (currentUser) {
      btnLoginTrigger.textContent = `👤 ${currentUser.email.split("@")[0]}`;
      userEmailDisplay.textContent = currentUser.email;
      btnAdminSync.classList.remove("hidden");
    } else {
      btnLoginTrigger.textContent = "👤 Entrar";
      btnAdminSync.classList.add("hidden");
    }
  }

  // ── ALERTAS E DELEGAÇÃO DE CLICKS GRID (Fase 2) ───────────────────────────
  function handleGridButtonClick(e) {
    const historyBtn = e.target.closest(".btn-history-trigger");
    const alertBtn = e.target.closest(".btn-alert-trigger");
    
    if (historyBtn) {
      const url = historyBtn.getAttribute("data-car-url");
      const title = historyBtn.getAttribute("data-car-title");
      const price = historyBtn.getAttribute("data-car-price");
      const dealer = historyBtn.getAttribute("data-car-dealer");
      openHistoryModal(url, title, price, dealer);
    } else if (alertBtn) {
      const url = alertBtn.getAttribute("data-car-url");
      const title = alertBtn.getAttribute("data-car-title");
      const price = alertBtn.getAttribute("data-car-price");
      openCreateAlertModal(url, title, price);
    }
  }

  function openCreateAlertModal(url, title, price) {
    createAlertModal.classList.remove("hidden");
    alertVehicleUrl.value = url;
    alertVehicleTitle.value = title;
    
    if (currentUser) {
      alertEmailInput.value = currentUser.email;
      alertEmailInput.disabled = true;
    } else {
      alertEmailInput.value = "";
      alertEmailInput.disabled = false;
    }
    
    const currentPriceVal = parseFloat(price);
    if (currentPriceVal && !isNaN(currentPriceVal)) {
      alertTargetPrice.value = Math.round(currentPriceVal * 0.95);
    } else {
      alertTargetPrice.value = "";
    }
  }

  async function openAlertsModal() {
    alertsModal.classList.remove("hidden");
    alertsListWrapper.innerHTML = "<p class='loading-alerts'>Carregando seus alertas...</p>";
    
    const email = currentUser ? currentUser.email : "";
    if (!email) {
      alertsListWrapper.innerHTML = "<p class='empty-alerts'>Faça login para gerenciar seus alertas.</p>";
      return;
    }

    try {
      const data = await Api.listarAlertas(email);
      const alerts = data.alerts || [];
      
      if (alerts.length === 0) {
        alertsListWrapper.innerHTML = "<p class='empty-alerts'>Você não possui alertas de preço ativos.</p>";
        return;
      }

      alertsListWrapper.innerHTML = "";
      alerts.forEach(alert => {
        const item = document.createElement("div");
        item.className = "alert-item";
        
        let title = alert.query ? `Busca: "${alert.query}"` : "Veículo Monitorado";
        if (alert.vehicle_url) {
          title = alert.vehicle_url.split("/").pop().replace(/-/g, " ").slice(0, 40) || "Veículo";
        }

        item.innerHTML = `
          <div class="alert-item-info">
            <span class="alert-item-title">${escapeHtml(title)}</span>
            <span class="alert-item-price">Preço alvo: R$ ${alert.target_price.toLocaleString("pt-BR")}</span>
          </div>
          <button type="button" class="btn-delete-alert" data-alert-id="${alert.id}" title="Excluir alerta">🗑️</button>
        `;
        alertsListWrapper.appendChild(item);
      });

      alertsListWrapper.querySelectorAll(".btn-delete-alert").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-alert-id");
          if (confirm("Deseja realmente remover este alerta?")) {
            try {
              await Api.removerAlerta(id);
              openAlertsModal();
            } catch (err) {
              alert("Erro ao excluir alerta.");
            }
          }
        });
      });
    } catch (err) {
      alertsListWrapper.innerHTML = "<p class='empty-alerts'>Erro ao carregar alertas.</p>";
    }
  }

  // ── HISTÓRICO DE PREÇOS COM SVG (Fase 2) ──────────────────────────────────
  async function openHistoryModal(url, title, currentPrice, dealer) {
    historyModal.classList.remove("hidden");
    historyCarTitle.textContent = title;
    historyCarDealer.textContent = dealer || "Revenda";
    historyChartWrapper.innerHTML = "<p class='loading-history'>Carregando histórico...</p>";
    historyTableBody.innerHTML = "";

    try {
      const data = await Api.obterHistoricoPreco(url, currentPrice);
      if (data.offline) {
        window.isOfflineMode = true;
      }
      
      const history = data.history || [];
      if (history.length === 0) {
        historyChartWrapper.innerHTML = "<p class='empty-alerts'>Sem dados de histórico suficientes.</p>";
        return;
      }

      history.forEach(item => {
        const row = document.createElement("tr");
        const dateStr = new Date(item.recorded_at).toLocaleDateString("pt-BR");
        const priceStr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(item.price_value);
        row.innerHTML = `
          <td>${dateStr}</td>
          <td>${priceStr}</td>
        `;
        historyTableBody.appendChild(row);
      });

      renderHistoryChart(history);
      
    } catch (err) {
      historyChartWrapper.innerHTML = "<p class='empty-alerts'>Erro ao carregar gráfico.</p>";
    }
  }

  function renderHistoryChart(history) {
    const width = 450;
    const height = 150;
    const padding = 20;

    const prices = history.map(h => h.price_value);
    const minPrice = Math.min(...prices) * 0.98;
    const maxPrice = Math.max(...prices) * 1.02;
    const priceRange = maxPrice - minPrice || 1;

    const points = [];
    history.forEach((h, index) => {
      const x = padding + (index / (history.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((h.price_value - minPrice) / priceRange) * (height - 2 * padding);
      points.push({ x, y, val: h.price_value, date: new Date(h.recorded_at).toLocaleDateString("pt-BR") });
    });

    let polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");

    let gridLinesHtml = "";
    for (let i = 1; i <= 3; i++) {
      const yGrid = padding + (i / 4) * (height - 2 * padding);
      gridLinesHtml += `<line x1="${padding}" y1="${yGrid}" x2="${width - padding}" y2="${yGrid}" stroke="#2d3748" stroke-dasharray="4,4" />`;
    }

    let interactiveElementsHtml = "";
    points.forEach(p => {
      const priceFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(p.val);
      interactiveElementsHtml += `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="#1976d2" stroke="#fff" stroke-width="2" />
        <text x="${p.x}" y="${p.y - 10}" font-family="Outfit, sans-serif" font-size="10" fill="#fff" text-anchor="middle" font-weight="600">${priceFormatted}</text>
        <text x="${p.x}" y="${height - 2}" font-family="Outfit, sans-serif" font-size="8" fill="#a0aec0" text-anchor="middle">${p.date}</text>
      `;
    });

    historyChartWrapper.innerHTML = `
      <svg class="history-chart-svg" viewBox="0 0 ${width} ${height}">
        ${gridLinesHtml}
        <polyline fill="none" stroke="#1976d2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
        ${interactiveElementsHtml}
      </svg>
    `;
  }

  // ── SINCRONIZAÇÃO DE STOCKS SEQUENCIAL (Fase 2) ───────────────────────────
  const DEALER_NAMES = [
    "ZM Veículos", "AMF Veículos", "Savinho Motors", "Ramiro Veículos", "GL Veículos",
    "Auto Prime RP", "KR Veículos", "Base Veículos", "MM Veículos RP", "Valvech Veículos",
    "Copa Veículos", "Auto Mais Veículos", "Rossi Veículos", "Seminovos Ribeirão Veículos",
    "TCA Motors", "Holf Autos", "Bolsa de Veículo", "Cristal Veículos", "Lexcar Multimarcas",
    "San Diego Veículos", "Hiper Auto", "Tharley Veículos", "Mix Veículos", "Kito Veículos",
    "Cem Veículos"
  ];

  function openAdminSyncModal() {
    adminSyncModal.classList.remove("hidden");
    dealersSyncList.innerHTML = "";

    DEALER_NAMES.forEach(name => {
      const row = document.createElement("div");
      row.className = "sync-row";
      row.id = `sync-row-${name.replace(/\s+/g, "-")}`;
      row.innerHTML = `
        <span class="sync-row-name">${escapeHtml(name)}</span>
        <div class="sync-bar-wrapper">
          <div class="sync-bar-track">
            <div class="sync-bar-fill" id="sync-fill-${name.replace(/\s+/g, "-")}"></div>
          </div>
          <span class="sync-bar-text" id="sync-text-${name.replace(/\s+/g, "-")}">0%</span>
        </div>
        <button type="button" class="btn-sync-single" data-dealer-name="${escapeHtml(name)}">Sincronizar</button>
      `;
      dealersSyncList.appendChild(row);
    });

    dealersSyncList.querySelectorAll(".btn-sync-single").forEach(btn => {
      btn.addEventListener("click", () => {
        const dealer = btn.getAttribute("data-dealer-name");
        syncSingleDealer(dealer);
      });
    });
  }

  async function syncSingleDealer(dealerName) {
    const slug = dealerName.replace(/\s+/g, "-");
    const fill = document.getElementById(`sync-fill-${slug}`);
    const text = document.getElementById(`sync-text-${slug}`);
    const btn = document.querySelector(`[data-dealer-name="${dealerName}"]`);

    if (btn) btn.disabled = true;
    if (fill) {
      fill.style.width = "40%";
      fill.style.background = "#ffa726";
    }
    if (text) text.textContent = "Processando...";

    try {
      const data = await Api.syncDealer(dealerName);
      if (data.offline) {
        window.isOfflineMode = true;
      }
      
      if (fill) {
        fill.style.width = "100%";
        fill.style.background = "#26a69a";
      }
      if (text) text.textContent = data.offline ? "Bypass" : `${data.totalUpserted || data.count || 0} enc.`;
    } catch (err) {
      console.error(err);
      if (fill) {
        fill.style.width = "100%";
        fill.style.background = "#e57373";
      }
      if (text) text.textContent = "Falhou";
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function syncAllDealers() {
    btnSyncAllDealers.disabled = true;
    btnSyncAllDealers.textContent = "Sincronizando Tudo...";

    for (const dealer of DEALER_NAMES) {
      await syncSingleDealer(dealer);
    }

    btnSyncAllDealers.disabled = false;
    btnSyncAllDealers.textContent = "Sincronizar Todas as Revendas";
  }

  if (btnSyncAllDealers) {
    btnSyncAllDealers.addEventListener("click", syncAllDealers);
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ══════════════════════════════════════════════════════════════════════
  // GESTÃO DO MEU ESTOQUE
  // ══════════════════════════════════════════════════════════════════════

  async function openMyStockModal() {
    myStockModal.classList.remove("hidden");
    myStockFormView.classList.add("hidden");
    myStockListView.classList.remove("hidden");
    await loadMyStock();
  }

  async function loadMyStock() {
    myStockListContainer.innerHTML = '<p>Carregando seu estoque...</p>';
    try {
      const res = await fetch("/api/meu-estoque");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Erro ao carregar");
      
      if (!data.carros || data.carros.length === 0) {
        myStockListContainer.innerHTML = '<p>Você ainda não tem veículos cadastrados no seu estoque.</p>';
        return;
      }

      myStockListContainer.innerHTML = data.carros.map(c => `
        <div style="border: 1px solid var(--border-color); padding: 10px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
          <div>
            <strong>${c.marca} ${c.modelo} (${c.ano})</strong><br>
            <small>R$ ${c.preco.toLocaleString('pt-BR', {minimumFractionDigits:2})} | ${c.fonte || 'Meu Estoque'}</small>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-outline btn-edit-stock" data-id="${c.id}" style="padding: 5px 10px;">Editar</button>
            <button class="btn-primary btn-delete-stock" data-id="${c.id}" style="padding: 5px 10px; background: var(--danger-color, #ef4444);">Excluir</button>
          </div>
        </div>
      `).join("");

      // Bind actions
      document.querySelectorAll(".btn-edit-stock").forEach(btn => {
        btn.addEventListener("click", () => {
          const carId = btn.getAttribute("data-id");
          const car = data.carros.find(c => c.id === carId);
          if (car) openEditStockForm(car);
        });
      });
      document.querySelectorAll(".btn-delete-stock").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("Tem certeza que deseja inativar (excluir) este veículo?")) {
            const carId = btn.getAttribute("data-id");
            await deleteMyStockCar(carId);
          }
        });
      });

    } catch (err) {
      myStockListContainer.innerHTML = `<p style="color: red;">Erro: ${err.message}</p>`;
    }
  }

  function openEditStockForm(car) {
    myStockForm.reset();
    document.getElementById("stock-id").value = car.id;
    document.getElementById("stock-marca").value = car.marca;
    document.getElementById("stock-modelo").value = car.modelo;
    document.getElementById("stock-ano").value = car.ano;
    document.getElementById("stock-preco").value = car.preco;
    document.getElementById("stock-km").value = car.quilometragem || "";
    document.getElementById("stock-cor").value = car.cor || "";
    document.getElementById("stock-img").value = car.imagem_url || "";
    document.getElementById("stock-fonte").value = car.fonte || "";
    document.getElementById("stock-url-ext").value = car.url_externo || "";
    
    document.getElementById("stock-form-title").textContent = "Editar Veículo";
    myStockListView.classList.add("hidden");
    myStockFormView.classList.remove("hidden");
  }

  async function handleMyStockSubmit(e) {
    e.preventDefault();
    const btnSubmit = myStockForm.querySelector("button[type='submit']");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Salvando...";

    const payload = {
      id: document.getElementById("stock-id").value || null,
      marca: document.getElementById("stock-marca").value,
      modelo: document.getElementById("stock-modelo").value,
      ano: document.getElementById("stock-ano").value,
      preco: document.getElementById("stock-preco").value,
      quilometragem: document.getElementById("stock-km").value,
      cor: document.getElementById("stock-cor").value,
      imagem_url: document.getElementById("stock-img").value,
      fonte: document.getElementById("stock-fonte").value,
      url_externo: document.getElementById("stock-url-ext").value
    };

    try {
      const res = await fetch("/api/meu-estoque", {
        method: payload.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      alert("Veículo salvo com sucesso!");
      myStockFormView.classList.add("hidden");
      myStockListView.classList.remove("hidden");
      await loadMyStock();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Salvar Veículo";
    }
  }

  async function deleteMyStockCar(id) {
    try {
      const res = await fetch(`/api/meu-estoque?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await loadMyStock();
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  }

  // ── Inicializa tudo ao carregar ─────────────────────────────────────
  init();

});
