// static/js/main.js

document.addEventListener("DOMContentLoaded", () => {
    // Elementos da Interface
    const body = document.body;
    const themeToggle = document.getElementById("theme-toggle");
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const progressContainer = document.getElementById("progress-container");
    const progressStatusText = document.getElementById("progress-status-text");
    const progressPercentage = document.getElementById("progress-percentage");
    const progressBarFill = document.getElementById("progress-bar-fill");
    const storeStatusList = document.getElementById("store-status-list");
    const resultsControls = document.getElementById("results-controls");
    const totalResultsCount = document.getElementById("total-results-count");
    const sortSelect = document.getElementById("sort-select");
    const resultsGrid = document.getElementById("results-grid");

    // Estado da Aplicação
    let activeEventSource = null;
    let allCars = []; // Armazena todos os carros encontrados na busca atual

    // 1. Gerenciamento do Tema (Dark/Light)
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        body.classList.add("light-theme");
        body.classList.remove("dark-theme");
    } else {
        body.classList.add("dark-theme");
        body.classList.remove("light-theme");
    }

    themeToggle.addEventListener("click", () => {
        if (body.classList.contains("dark-theme")) {
            body.classList.remove("dark-theme");
            body.classList.add("light-theme");
            localStorage.setItem("theme", "light");
        } else {
            body.classList.remove("light-theme");
            body.classList.add("dark-theme");
            localStorage.setItem("theme", "dark");
        }
    });

    // 2. Submissão do Formulário de Busca
    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        startSearch(query);
    });

    // Função que inicia a busca via Server-Sent Events (SSE)
    function startSearch(query) {
        // Cancela busca anterior se estiver ativa
        if (activeEventSource) {
            activeEventSource.close();
        }

        // Limpa estado anterior
        allCars = [];
        resultsGrid.innerHTML = "";
        storeStatusList.innerHTML = "";
        
        // Bloqueia inputs
        searchInput.disabled = true;
        searchBtn.disabled = true;
        searchBtn.textContent = "Buscando...";

        // Exibe área de progresso e oculta controles
        progressContainer.classList.remove("hidden");
        resultsControls.classList.add("hidden");
        progressBarFill.style.width = "0%";
        progressStatusText.textContent = "Iniciando busca nos estoques...";
        progressPercentage.textContent = "0 Lojas";

        // Cria a conexão SSE com o backend
        const url = `/search?query=${encodeURIComponent(query)}`;
        activeEventSource = new EventSource(url);

        activeEventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "progress") {
                // Atualiza progresso da barra
                const percent = ((data.index - 0.5) / data.total) * 100;
                progressBarFill.style.width = `${percent}%`;
                progressPercentage.textContent = `${data.index}/${data.total} Lojas`;
                progressStatusText.textContent = `Buscando em: ${data.site_name}...`;

                // Adiciona ou atualiza badge da loja na lista
                updateStoreBadge(data.site_name, "searching", "Buscando...");
            } 
            
            else if (data.type === "results") {
                const percent = (data.index / data.total) * 100;
                progressBarFill.style.width = `${percent}%`;
                progressPercentage.textContent = `${data.index}/${data.total} Lojas`;

                // Processa os resultados encontrados nessa loja
                const count = data.results ? data.results.length : 0;
                
                if (data.status === "error") {
                    updateStoreBadge(data.site_name, "error", "Falhou");
                } else {
                    updateStoreBadge(data.site_name, "success", `${count} enc.`);
                }

                if (count > 0) {
                    allCars = allCars.concat(data.results);
                    renderCarsGrid();
                }
            } 
            
            else if (data.type === "done") {
                progressBarFill.style.width = "100%";
                progressStatusText.textContent = "Busca finalizada!";
                finishSearch();
            } 
            
            else if (data.type === "error") {
                progressStatusText.textContent = `Erro: ${data.message}`;
                finishSearch();
            }
        };

        activeEventSource.onerror = (err) => {
            console.error("Erro na conexão SSE:", err);
            progressStatusText.textContent = "A busca foi interrompida ou perdeu conexão com o servidor.";
            finishSearch();
        };
    }

    function finishSearch() {
        if (activeEventSource) {
            activeEventSource.close();
            activeEventSource = null;
        }

        // Desbloqueia inputs
        searchInput.disabled = false;
        searchBtn.disabled = false;
        searchBtn.textContent = "Buscar";

        // Exibe controles de resultados se houver carros
        if (allCars.length > 0) {
            resultsControls.classList.remove("hidden");
            totalResultsCount.textContent = allCars.length;
        } else {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Nenhum veículo encontrado</h3>
                    <p>Não encontramos nenhum anúncio correspondente ao termo pesquisado nas lojas consultadas. Tente buscar termos mais genéricos.</p>
                </div>
            `;
        }
    }

    // 3. Atualização dos badges de progresso de cada loja
    function updateStoreBadge(storeName, status, label) {
        let storeItem = document.getElementById(`store-${storeName.replace(/\s+/g, '-').toLowerCase()}`);
        
        if (!storeItem) {
            storeItem = document.createElement("div");
            storeItem.id = `store-${storeName.replace(/\s+/g, '-').toLowerCase()}`;
            storeItem.className = "store-status-item";
            
            const nameSpan = document.createElement("span");
            nameSpan.className = "store-name";
            nameSpan.textContent = storeName;
            
            const badgeSpan = document.createElement("span");
            badgeSpan.className = "store-badge";
            
            storeItem.appendChild(nameSpan);
            storeItem.appendChild(badgeSpan);
            storeStatusList.appendChild(storeItem);
        }

        const badge = storeItem.querySelector(".store-badge");
        badge.className = `store-badge ${status}`;
        
        // Ícone correspondente ao status
        let icon = "";
        if (status === "searching") icon = "⏳ ";
        if (status === "success") icon = "✅ ";
        if (status === "error") icon = "❌ ";
        
        badge.textContent = `${icon}${label}`;
    }

    // 4. Renderização do Grid de Cards de Carros
    function renderCarsGrid() {
        // Aplica ordenação antes de renderizar
        sortCars();

        resultsGrid.innerHTML = "";

        allCars.forEach(car => {
            const card = document.createElement("div");
            card.className = "car-card";

            // Fallback elegante para imagens indisponíveis ou quebradas
            const defaultImg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%231e293b'><rect width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='12' font-weight='bold'>Sem Foto</text></svg>";
            const imgSrc = car.image_url ? car.image_url : defaultImg;

            card.innerHTML = `
                <div class="car-image-container">
                    <img src="${imgSrc}" alt="${car.title}" loading="lazy" onerror="this.onerror=null; this.src=&quot;${defaultImg}&quot;;">
                    <span class="car-dealer-badge">${car.dealer_name}</span>
                </div>
                <div class="car-details">
                    <h3 class="car-title" title="${car.title}">${car.title}</h3>
                    <div class="car-bottom">
                        <span class="car-price">${car.price}</span>
                        <a href="${car.url}" target="_blank" class="car-link-btn">
                            Ver Anúncio <span>➔</span>
                        </a>
                    </div>
                </div>
            `;

            resultsGrid.appendChild(card);
        });
    }

    // 5. Ordenação dos Resultados
    sortSelect.addEventListener("change", () => {
        if (allCars.length > 0) {
            renderCarsGrid();
        }
    });

    function sortCars() {
        const sortType = sortSelect.value;
        if (sortType === "price-asc") {
            allCars.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
        } else if (sortType === "price-desc") {
            allCars.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
        }
    }

    // Helper para converter string de preço "R$ 50.000,00" para float
    function parsePrice(priceStr) {
        if (!priceStr || priceStr.toLowerCase().includes("consulta") || priceStr.toLowerCase().includes("combinar")) {
            return Infinity; // Preços sob consulta vão para o final na ordem crescente
        }
        // Remove tudo que não for número, vírgula ou ponto, depois normaliza
        let clean = priceStr.replace(/[^\d,]/g, "").replace(",", ".");
        let value = parseFloat(clean);
        return isNaN(value) ? Infinity : value;
    }
});
