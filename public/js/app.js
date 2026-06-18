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

  // ══════════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ══════════════════════════════════════════════════════════════════════

  function init() {
    loadThemePreference();
    loadSavedUrls();
    bindEvents();
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

    allCars = [];
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
          UI.renderCars(sorted);
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
    } else {
      const enriched = enrichCarsWithFipe(cars);
      const sorted = sortCars(enriched, sortSelect.value);
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
      UI.renderCars(sorted);
    }
  }

  // ── Inicializa tudo ao carregar ─────────────────────────────────────
  init();

});
