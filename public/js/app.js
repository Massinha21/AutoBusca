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

  // ══════════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ══════════════════════════════════════════════════════════════════════

  function init() {
    loadThemePreference();
    loadSavedUrls();
    bindEvents();
    initFilters();
    checkUrlParams();
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
    } else {
      populateFiltersData(cars);
      resetFiltersUI();
      const enriched = enrichCarsWithFipe(cars);
      const sorted = sortCars(enriched, sortSelect.value);
      UI.renderCars(sorted, activeCompareUrls);
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
    } else {
      UI.renderCars(sorted, activeCompareUrls);
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

  // ── Inicializa tudo ao carregar ─────────────────────────────────────
  init();

});
