// public/js/detalhes.js
//
// Lógica da página de detalhes do veículo.
// Lê os parâmetros da URL, calcula comparações FIPE no lado do cliente
// e popula os elementos do DOM dinamicamente.

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("details-container");
  const btnBack = document.getElementById("btn-back");

  // Imagem de fallback caso o anúncio não tenha imagem válida
  const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350">
      <rect width="500" height="350" fill="#1e2a40"/>
      <text x="250" y="150" text-anchor="middle" fill="#4a5568" font-family="sans-serif" font-size="60">🚗</text>
      <text x="250" y="210" text-anchor="middle" fill="#4a5568" font-family="sans-serif" font-size="18">Sem foto disponível</text>
    </svg>
  `)}`;

  // Navegação de volta
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (document.referrer && document.referrer.includes(window.location.hostname)) {
        window.history.back();
      } else {
        window.location.href = "index.html";
      }
    });
  }

  // 1. Extração dos parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const title = urlParams.get("title");
  const price = urlParams.get("price") || "Sob consulta";
  const priceValStr = urlParams.get("price_value");
  const priceVal = priceValStr && priceValStr !== "null" ? parseFloat(priceValStr) : null;
  const img = urlParams.get("img");
  const originalUrl = urlParams.get("url") || "#";
  const dealer = urlParams.get("dealer") || "Revenda";
  const year = urlParams.get("year");
  const km = urlParams.get("km");
  const fipePriceStr = urlParams.get("fipe_price");
  const fipePrice = fipePriceStr && fipePriceStr !== "null" ? parseFloat(fipePriceStr) : null;

  if (!title) {
    container.innerHTML = `
      <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <p style="color: var(--accent-red); font-size: 1.2rem; font-weight: 600;">Veículo não encontrado</p>
        <p style="color: var(--text-secondary); margin-top: 0.5rem;">Nenhum detalhe foi fornecido na URL.</p>
        <a href="index.html" class="nav-link-btn" style="margin-top: 1.5rem; display: inline-block;">Voltar para o buscador</a>
      </div>
    `;
    return;
  }

  // 2. Lógica de Comparação FIPE
  let comparisonHtml = "";
  if (fipePrice && priceVal && priceVal > 0) {
    const diff = priceVal - fipePrice;
    const percent = (diff / fipePrice) * 100;
    const isBelow = diff < 0;
    const absDiff = Math.abs(diff);
    const formattedDiff = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(absDiff);
    const percentStr = `${Math.abs(percent).toFixed(1)}%`;
    const formattedFipe = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(fipePrice);

    comparisonHtml = `
      <div class="details-fipe-compare ${isBelow ? 'below' : 'above'}" title="Comparativo com a FIPE de referência">
        <span class="compare-icon">${isBelow ? '▼' : '▲'}</span>
        <div class="compare-info">
          <strong>${formattedDiff} (${percentStr}) ${isBelow ? 'abaixo' : 'acima'}</strong> da Tabela FIPE
          <div class="fipe-ref">Referência FIPE: ${formattedFipe}</div>
        </div>
      </div>
    `;
  }

  // Configura a imagem do veículo
  const imgSrc = img && img !== "null" && img.startsWith("http") ? img : PLACEHOLDER_IMG;

  // 3. Renderiza o conteúdo do carro
  container.innerHTML = `
    <!-- Coluna da Imagem -->
    <div class="details-image-section">
      <div class="details-img-wrapper">
        <img src="${escapeHtml(imgSrc)}" alt="Imagem do veículo ${escapeHtml(title)}" class="details-main-img" onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';">
      </div>
    </div>

    <!-- Coluna das Informações -->
    <div class="details-info-section">
      <h2 class="details-title">${escapeHtml(title)}</h2>
      <div class="details-dealer-tag">${escapeHtml(dealer)}</div>
      
      <div class="details-price-row">
        <span class="details-price-label">Preço</span>
        <span class="details-price-value">${escapeHtml(price)}</span>
      </div>

      ${comparisonHtml}

      <!-- Especificações -->
      <div class="details-specs">
        <h3>Especificações</h3>
        <div class="spec-grid">
          <div class="spec-card">
            <span class="spec-icon">📅</span>
            <span class="spec-label">Ano</span>
            <span class="spec-value">${escapeHtml(year || "Não informado")}</span>
          </div>
          <div class="spec-card">
            <span class="spec-icon">🛣️</span>
            <span class="spec-label">Km</span>
            <span class="spec-value">${escapeHtml(km || "Não informado")}</span>
          </div>
          <div class="spec-card">
            <span class="spec-icon">🏬</span>
            <span class="spec-label">Loja</span>
            <span class="spec-value">${escapeHtml(dealer)}</span>
          </div>
          <div class="spec-card">
            <span class="spec-icon">⛽</span>
            <span class="spec-label">Combustível</span>
            <span class="spec-value">Flex / Gasolina</span>
          </div>
        </div>
      </div>

      <!-- Ações -->
      <div class="details-actions">
        <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener noreferrer" class="btn-action-primary">
          🚀 Ir para o anúncio original
        </a>
        <button id="btn-interest" class="btn-action-secondary">
          💬 Tenho interesse (WhatsApp)
        </button>
        <button id="btn-share" class="btn-action-tertiary">
          🔗 Compartilhar
        </button>
      </div>
    </div>
  `;

  // 4. Lógica das Ações
  const btnShare = document.getElementById("btn-share");
  const btnInterest = document.getElementById("btn-interest");

  if (btnShare) {
    btnShare.addEventListener("click", async () => {
      const shareData = {
        title: `AutoBusca — ${title}`,
        text: `Olha esse ${title} (${price}) na revenda ${dealer} que encontrei no AutoBusca!`,
        url: window.location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback Clipboard copy
          await navigator.clipboard.writeText(window.location.href);
          const originalText = btnShare.textContent;
          btnShare.textContent = "✓ Link copiado!";
          btnShare.classList.add("copied");
          setTimeout(() => {
            btnShare.textContent = originalText;
            btnShare.classList.remove("copied");
          }, 2000);
        }
      } catch (err) {
        console.error("Erro ao compartilhar:", err);
      }
    });
  }

  if (btnInterest) {
    btnInterest.addEventListener("click", () => {
      const text = `Olá! Vi o anúncio do carro *${title}* (${price}) da revenda *${dealer}* no AutoBusca e tenho interesse em obter mais detalhes. Link do anúncio original: ${originalUrl}`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, "_blank");
    });
  }
});

/**
 * Escapa HTML para prevenir XSS
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
