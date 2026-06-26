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
  const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2352525b'><path d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/></svg>";

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
  /**
   * Renderiza a lista completa de carros no grid.
   * Substitui todo o conteúdo atual do grid.
   *
   * @param {Array} cars - Array de objetos de carro
   * @param {Set} activeCompareUrls - Set contendo as URLs dos carros selecionados para comparação
   */
  function renderCars(cars, activeCompareUrls = new Set()) {
    const grid = els.resultsGrid();
    grid.innerHTML = "";

    if (!cars || cars.length === 0) {
      renderNoResults();
      return;
    }

    let bestDiscountPercent = -1;
    let bestCarIndex = -1;
    cars.forEach((car, i) => {
      if (car.comparison && car.comparison.diff < 0) {
        const pct = Math.abs(car.comparison.percent);
        if (pct > bestDiscountPercent && pct > 2) { // At least 2% to be "best deal"
          bestDiscountPercent = pct;
          bestCarIndex = i;
        }
      }
    });

    cars.forEach((car, index) => {
      const card = createCarCard(car, index, activeCompareUrls, index === bestCarIndex);
      grid.appendChild(card);
    });
  }

  /**
   * Cria o elemento DOM de um card de carro.
   *
   * @param {Object} car   - Dados do carro { title, price, image_url, url, dealer_name }
   * @param {number} index - Índice para animação escalonada
   * @param {Set} activeCompareUrls - Set de URLs selecionadas
   * @returns {HTMLElement}
   */
  function createCarCard(car, index, activeCompareUrls = new Set(), isBestDeal = false) {
    const card = document.createElement("article");
    card.className = "car-card" + (car.is_own_stock ? " is-own-stock" : "");
    card.setAttribute('data-url', car.url);
    card.setAttribute("aria-label", `${car.title} - ${car.price}`);
    // Atraso de animação para efeito cascata (máximo de 8 cards animados)
    card.style.animationDelay = `${Math.min(index, 7) * 0.045}s`;

    
    let bestDealHtml = "";
    if (isBestDeal) {
      bestDealHtml = `<div class="best-deal-badge">🌟 Melhor Preço</div>`;
    }

    const imgSrc = car.image_url && car.image_url.startsWith("http")
      ? car.image_url
      : PLACEHOLDER_IMG;

    const isNoPrice = !car.price_value && (
      !car.price ||
      car.price.toLowerCase().includes("consulta") ||
      car.price.toLowerCase().includes("combinar")
    );

    let comparisonHtml = "";
    if (car.fipe_price_str) {
      // Lógica nova: cada carro tem sua própria FIPE
      const fipeValor = car.fipe_price_value;
      const fipeNome = car.fipe_model_name;
      const fipePriceStr = car.fipe_price_str;

      let badgeHtml = "";
      if (car.price_value && fipeValor && car.price_value > 0) {
        const diff = car.price_value - fipeValor;
        const isBelow = diff < 0;
        const absDiff = Math.abs(diff);
        const percent = (absDiff / fipeValor) * 100;
        
        const formattedDiff = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0
        }).format(absDiff);
        const percentStr = `${percent.toFixed(1)}%`;

        badgeHtml = `
          <div class="fipe-card-badge ${isBelow ? 'below' : 'above'}" title="Preço do anúncio vs FIPE: ${fipeNome}">
            ${isBelow ? '▼' : '▲'} ${formattedDiff} (${percentStr}) ${isBelow ? 'abaixo' : 'acima'} da FIPE
          </div>
        `;
      }

      comparisonHtml = `
        <div class="fipe-info-container" style="margin-top: 10px; background: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 6px; font-size: 0.8rem; border-left: 3px solid #3b82f6; display: flex; flex-direction: column; gap: 4px;">
          <div style="color: #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
             <span>Tabela FIPE:</span> <strong>${fipePriceStr}</strong>
          </div>
          <div style="font-size: 0.75rem; line-height: 1.3; margin-top: 2px;">
            <a href="https://www.google.com/search?q=Tabela+FIPE+${encodeURIComponent(fipeNome)}" target="_blank" style="color: #60a5fa; text-decoration: none; font-weight: 500;" title="Pesquisar esta versão no Google">
              ${escapeHtml(fipeNome)} ↗
            </a>
          </div>
          ${badgeHtml}
        </div>
      `;
    } else if (car.comparison) {
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
    if (car.year || car.km || car.version) {
      metaHtml = `
        <div class="car-meta">
          ${car.year ? `<span class="meta-item" title="Ano do modelo"><span class="meta-icon">📅</span> ${escapeHtml(car.year)}</span>` : ""}
          ${car.km ? `<span class="meta-item" title="Quilometragem"><span class="meta-icon">🛣️</span> ${escapeHtml(car.km)}</span>` : ""}
          ${car.version ? `<span class="meta-item" title="Versão"><span class="meta-icon">🏷️</span> ${escapeHtml(car.version)}</span>` : ""}
        </div>
      `;
    }

    let salvageBadgeHtml = "";
    if (car.is_salvage) {
      salvageBadgeHtml = `
        <div class="salvage-badge" style="background-color: #ff3b3b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-top: 8px; display: inline-flex; align-items: center; gap: 4px;">
          <span style="font-size: 14px;">🚨</span> Passagem por Leilão/Sinistro
        </div>
      `;
    }

    // Badge de Qualidade (Marketplace)
    let qualityBadgeHtml = "";
    if (car.quality_badge) {
      let badgeClass = "";
      let badgeLabel = "";
      
      if (car.quality_badge === "good") {
        badgeClass = "badge-good";
        badgeLabel = "✅ Bom";
      } else if (car.quality_badge === "neutral") {
        badgeClass = "badge-neutral";
        badgeLabel = "⚠️ Neutro";
      } else if (car.quality_badge === "suspicious") {
        badgeClass = "badge-suspicious";
        badgeLabel = "❌ Suspeito";
      }

      qualityBadgeHtml = `
        <div class="quality-badge ${badgeClass}" title="${escapeHtml(car.quality_reason || '')}">
          ${badgeLabel}
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

    const isCompared = activeCompareUrls.has(car.url);

    card.innerHTML = `
      <div class="car-image-wrap">
        <label class="car-compare-label" title="Selecionar para comparação">
          <input type="checkbox" class="compare-checkbox" data-car-url="${escapeHtml(car.url)}" ${isCompared ? 'checked' : ''}>
          <span>Comparar</span>
        </label>
        <a href="${detailsUrl}" aria-label="Ver detalhes de ${escapeHtml(car.title)}" class="car-card-link-wrapper">
          <img
            src="${escapeHtml(imgSrc)}"
            alt="Foto de ${escapeHtml(car.title)}"
            loading="lazy"
            onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
          >
        </a>
        ${car.is_own_stock ? '<span class="own-stock-badge">👑 Nosso Estoque</span>' : ''}
        <span class="dealer-badge">${escapeHtml(car.dealer_name || "Revenda")}</span>
      </div>

      <div class="car-body">
        <h3 class="car-title" title="${escapeHtml(car.title)}">
          <a href="${detailsUrl}" class="car-title-link">
            ${escapeHtml(car.title)}
          </a>
        </h3>
        ${metaHtml}
        ${salvageBadgeHtml}
        ${comparisonHtml}
        ${qualityBadgeHtml}
        
        <div class="car-actions-row" style="display:flex; gap:6px; margin: 10px 0;">
          
          
        </div>

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
  
  /** Helper para cores de Revendas */
  const dealerColors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#fb7185", "#38bdf8", "#34d399", "#a3e635"
  ];

  function getDealerColor(dealerName) {
    let hash = 0;
    for (let i = 0; i < dealerName.length; i++) {
      hash = dealerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    return dealerColors[hash % dealerColors.length];
  }

  function getDealerInitials(dealerName) {
    const words = dealerName.replace(/veiculos|veículos|motors|multimarcas|autos|automóveis|car/ig, "").trim().split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  window.getDealerColor = getDealerColor;
  window.getDealerInitials = getDealerInitials;

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
   * Mostra mensagem "Nenhum resultado corresponde aos filtros".
   */
  function renderNoResultsFiltered() {
    const grid = els.resultsGrid();
    grid.innerHTML = `
      <div class="empty-state" role="status">
        <div class="empty-icon" aria-hidden="true">⚙️</div>
        <h3>Nenhum veículo corresponde aos filtros</h3>
        <p>Tente ajustar ou limpar seus filtros avançados na barra lateral para ver os anúncios novamente.</p>
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
      item = document.createElement("div");
      item.id = itemId;
      item.className = "store-status-item";
      const iconHtml = window.getDealerColor ? `<span class="dealer-icon" style="background-color: ${window.getDealerColor(storeName)}; width: 16px; height: 16px; font-size: 0.55rem; margin-right: 0.3rem;">${window.getDealerInitials(storeName)}</span>` : '';
      item.innerHTML = `
        <div style="display: flex; align-items: center;">
          ${iconHtml}
          <span class="store-name">${escapeHtml(storeName)}</span>
        </div>
        <span class="store-badge"></span>
      `;
      listEl.appendChild(item);
    }

    const badge = item.querySelector(".store-badge");
    badge.className = `store-badge ${status}`;

    // Semantic text colors for badges
    if (status === 'success') badge.style.color = 'var(--accent-green)';
    else if (status === 'error') badge.style.color = 'var(--accent-red)';
    else if (status === 'searching') badge.style.color = 'var(--accent)';
    else badge.style.color = 'var(--text-muted)';

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

  /**
   * Atualiza o contador de resultados exibido.
   */
  function updateResultsCount(count) {
    const el = els.totalResultsCount();
    if (el) el.textContent = count;
  }

  // Interface pública do módulo
  return {
    renderCars,
    showSkeletons,
    renderNoResults,
    renderNoResultsFiltered,
    renderError,
    showProgress,
    hideProgress,
    setProgressBar,
    updateStoreBadge,
    showResultsControls,
    hideResultsControls,
    showFipeCompareBanner,
    hideFipeCompareBanner,
    updateResultsCount,
  };
})();
