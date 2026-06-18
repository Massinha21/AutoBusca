// public/js/ui.js
//
// Responsável por RENDERIZAR elementos visuais na página:
//   - Cards de carros
//   - Skeletons de carregamento
//   - Badges de progresso por loja
//   - Estados vazios (nenhum resultado, erro)
//
// Este módulo NÃO faz chamadas de rede nem acessa localStorage.
// Ele só recebe dados e atualiza o DOM.

const UI = (() => {
  // ── Imagem de fallback (SVG inline) usada quando o carro não tem foto ──
  // Evita ícones quebrados no lugar das imagens
  const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
      <rect width="300" height="200" fill="#1e2a40"/>
      <text x="150" y="85"  text-anchor="middle" fill="#4a5568" font-family="sans-serif" font-size="42">🚗</text>
      <text x="150" y="125" text-anchor="middle" fill="#4a5568" font-family="sans-serif" font-size="14">Sem foto disponível</text>
    </svg>
  `)}`;

  // ── Referências dos elementos do DOM ──
  // Todas obtidas aqui uma única vez para melhor performance
  const els = {
    resultsGrid:      () => document.getElementById("results-grid"),
    storeStatusList:  () => document.getElementById("store-status-list"),
    progressContainer:() => document.getElementById("progress-container"),
    progressStatusText:()=> document.getElementById("progress-status-text"),
    progressPercentage:()=> document.getElementById("progress-percentage"),
    progressBarFill:  () => document.getElementById("progress-bar-fill"),
    resultsControls:  () => document.getElementById("results-controls"),
    totalResultsCount:() => document.getElementById("total-results-count"),
  };

  // ══════════════════════════════════════════════════════
  // CARDS DE CARRO
  // ══════════════════════════════════════════════════════

  /**
   * Renderiza a lista completa de carros no grid.
   * Substitui todo o conteúdo atual do grid.
   *
   * @param {Array} cars - Array de objetos de carro
   */
  function renderCars(cars) {
    const grid = els.resultsGrid();
    grid.innerHTML = "";

    if (!cars || cars.length === 0) {
      renderNoResults();
      return;
    }

    cars.forEach((car, index) => {
      const card = createCarCard(car, index);
      grid.appendChild(card);
    });
  }

  /**
   * Cria o elemento DOM de um card de carro.
   *
   * @param {Object} car   - Dados do carro { title, price, image_url, url, dealer_name }
   * @param {number} index - Índice para animação escalonada
   * @returns {HTMLElement}
   */
  function createCarCard(car, index) {
    const card = document.createElement("article");
    card.className = "car-card";
    card.setAttribute("aria-label", `${car.title} - ${car.price}`);
    // Atraso de animação para efeito cascata (máximo de 8 cards animados)
    card.style.animationDelay = `${Math.min(index, 7) * 0.045}s`;

    const imgSrc = car.image_url && car.image_url.startsWith("http")
      ? car.image_url
      : PLACEHOLDER_IMG;

    const isNoPrice = !car.price_value && (
      !car.price ||
      car.price.toLowerCase().includes("consulta") ||
      car.price.toLowerCase().includes("combinar")
    );

    let comparisonHtml = "";
    if (car.comparison) {
      const isBelow = car.comparison.diff < 0;
      const absDiff = Math.abs(car.comparison.diff);
      const formattedDiff = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0
      }).format(absDiff);
      const percentStr = `${Math.abs(car.comparison.percent).toFixed(1)}%`;

      comparisonHtml = `
        <div class="fipe-card-badge ${isBelow ? 'below' : 'above'}" title="Preço em relação à tabela FIPE de referência">
          ${isBelow ? '▼' : '▲'} ${formattedDiff} (${percentStr}) ${isBelow ? 'abaixo' : 'acima'} da FIPE
        </div>
      `;
    }

    let metaHtml = "";
    if (car.year || car.km) {
      metaHtml = `
        <div class="car-meta">
          ${car.year ? `<span class="meta-item" title="Ano do modelo"><span class="meta-icon">📅</span> ${escapeHtml(car.year)}</span>` : ""}
          ${car.km ? `<span class="meta-item" title="Quilometragem"><span class="meta-icon">🛣️</span> ${escapeHtml(car.km)}</span>` : ""}
        </div>
      `;
    }

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

    card.innerHTML = `
      <div class="car-image-wrap">
        <a href="${detailsUrl}" aria-label="Ver detalhes de ${escapeHtml(car.title)}" class="car-card-link-wrapper">
          <img
            src="${escapeHtml(imgSrc)}"
            alt="Foto de ${escapeHtml(car.title)}"
            loading="lazy"
            onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
          >
        </a>
        <span class="dealer-badge">${escapeHtml(car.dealer_name || "Revenda")}</span>
      </div>

      <div class="car-body">
        <h3 class="car-title" title="${escapeHtml(car.title)}">
          <a href="${detailsUrl}" class="car-title-link">
            ${escapeHtml(car.title)}
          </a>
        </h3>
        ${metaHtml}
        ${comparisonHtml}
        <div class="car-footer">
          <span class="car-price ${isNoPrice ? "no-price" : ""}">
            ${escapeHtml(car.price || "Sob consulta")}
          </span>
          <a
            href="${escapeHtml(car.url)}"
            target="_blank"
            rel="noopener noreferrer"
            class="car-link-btn"
            aria-label="Ver anúncio de ${escapeHtml(car.title)} em nova aba"
          >
            Ver anúncio <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    `;

    return card;
  }

  // ══════════════════════════════════════════════════════
  // SKELETON LOADERS
  // ══════════════════════════════════════════════════════

  /**
   * Exibe N cards de skeleton enquanto a busca está acontecendo.
   * Dá feedback visual imediato de que "algo está carregando".
   *
   * @param {number} count - Quantidade de skeletons a exibir
   */
  function showSkeletons(count = 6) {
    const grid = els.resultsGrid();
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
      grid.appendChild(createSkeletonCard());
    }
  }

  /**
   * Cria um card de skeleton (placeholder animado).
   * @returns {HTMLElement}
   */
  function createSkeletonCard() {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-line long" style="margin-top: 1rem;"></div>
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-btn"></div>
    `;
    return card;
  }

  // ══════════════════════════════════════════════════════
  // ESTADOS VAZIOS
  // ══════════════════════════════════════════════════════

  /**
   * Mostra mensagem "Nenhum resultado encontrado".
   */
  function renderNoResults() {
    const grid = els.resultsGrid();
    grid.innerHTML = `
      <div class="empty-state" role="status">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <h3>Nenhum veículo encontrado</h3>
        <p>Não encontramos anúncios com esse termo nas revendas consultadas. Tente usar termos mais genéricos (ex: "HB20" em vez de "HB20 2022 prata").</p>
      </div>
    `;
  }

  /**
   * Mostra mensagem de erro geral.
   * @param {string} message - Descrição do erro
   */
  function renderError(message) {
    const grid = els.resultsGrid();
    grid.innerHTML = `
      <div class="empty-state" role="alert">
        <div class="empty-icon" aria-hidden="true">⚠️</div>
        <h3>Não foi possível buscar</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  // ══════════════════════════════════════════════════════
  // PROGRESSO DE BUSCA
  // ══════════════════════════════════════════════════════

  /**
   * Exibe o painel de progresso.
   * @param {number} total - Total de lojas a consultar
   */
  function showProgress(total) {
    els.progressContainer().classList.remove("hidden");
    els.storeStatusList().innerHTML = "";
    setProgressBar(0, total, "Iniciando busca...");
  }

  /**
   * Esconde o painel de progresso.
   */
  function hideProgress() {
    els.progressContainer().classList.add("hidden");
  }

  /**
   * Atualiza a barra de progresso e texto de status.
   *
   * @param {number} current - Lojas processadas até agora
   * @param {number} total   - Total de lojas
   * @param {string} text    - Texto descritivo de status
   */
  function setProgressBar(current, total, text) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    els.progressBarFill().style.width = `${percent}%`;
    els.progressStatusText().textContent = text || "";
    els.progressPercentage().textContent = `${current}/${total} lojas`;

    // Atualiza o atributo ARIA para acessibilidade
    const track = document.querySelector(".progress-bar-track");
    if (track) track.setAttribute("aria-valuenow", percent);
  }

  /**
   * Atualiza (ou cria) o badge de status de uma loja no painel de progresso.
   *
   * @param {string} storeName - Nome da loja
   * @param {"waiting"|"searching"|"success"|"error"} status
   * @param {string} label     - Texto curto do badge (ex: "3 enc.", "Falhou")
   */
  function updateStoreBadge(storeName, status, label) {
    const listEl = els.storeStatusList();
    // Usa um ID derivado do nome para encontrar o item existente
    const itemId = `store-item-${storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
    let item = document.getElementById(itemId);

    if (!item) {
      // Cria o item da loja pela primeira vez
      item = document.createElement("div");
      item.id = itemId;
      item.className = "store-status-item";
      item.innerHTML = `
        <span class="store-name">${escapeHtml(storeName)}</span>
        <span class="store-badge"></span>
      `;
      listEl.appendChild(item);
    }

    const badge = item.querySelector(".store-badge");
    badge.className = `store-badge ${status}`;

    const icons = { waiting: "⏸", searching: "⏳", success: "✅", error: "❌" };
    badge.textContent = `${icons[status] || ""} ${label}`;
  }

  // ══════════════════════════════════════════════════════
  // CONTROLES DE RESULTADO
  // ══════════════════════════════════════════════════════

  /**
   * Exibe a barra de controles (contagem + ordenação) com o total correto.
   * @param {number} count
   */
  function showResultsControls(count) {
    els.resultsControls().classList.remove("hidden");
    els.totalResultsCount().textContent = count;
  }

  /**
   * Esconde a barra de controles.
   */
  function hideResultsControls() {
    els.resultsControls().classList.add("hidden");
  }

  // ══════════════════════════════════════════════════════
  // UTILITÁRIOS INTERNOS
  // ══════════════════════════════════════════════════════

  /**
   * Escapa caracteres especiais HTML para evitar XSS.
   * IMPORTANTE: sempre use esta função antes de inserir strings dinâmicas no DOM.
   *
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Exibe o banner de comparação com o preço de referência da FIPE.
   */
  function showFipeCompareBanner(modelName, formattedPrice, onClear) {
    const container = document.getElementById("fipe-compare-container");
    if (!container) return;

    container.innerHTML = `
      <div class="fipe-compare-banner">
        <div class="fipe-compare-info">
          <span>⚖️</span>
          Comparando com a Tabela FIPE: <strong>${escapeHtml(modelName)}</strong> (FIPE: <strong>${escapeHtml(formattedPrice)}</strong>)
        </div>
        <button class="btn-clear-compare" id="btn-clear-fipe-compare">Limpar Comparação</button>
      </div>
    `;

    const btnClear = document.getElementById("btn-clear-fipe-compare");
    if (btnClear && onClear) {
      btnClear.addEventListener("click", onClear);
    }
  }

  /**
   * Remove o banner de comparação da tela.
   */
  function hideFipeCompareBanner() {
    const container = document.getElementById("fipe-compare-container");
    if (container) {
      container.innerHTML = "";
    }
  }

  // Interface pública do módulo
  return {
    renderCars,
    showSkeletons,
    renderNoResults,
    renderError,
    showProgress,
    hideProgress,
    setProgressBar,
    updateStoreBadge,
    showResultsControls,
    hideResultsControls,
    showFipeCompareBanner,
    hideFipeCompareBanner,
  };
})();
