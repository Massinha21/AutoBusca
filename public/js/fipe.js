// public/js/fipe.js
//
// Lógica completa da página de consulta FIPE.
// Usa a API pública do Parallelum (sem chave de API necessária):
//   Base: https://parallelum.com.br/fipe/api/v1/{tipo}/marcas
//
// Fluxo:
//   1. Usuário escolhe tipo (carros/motos/caminhoes)
//   2. Carrega marcas → usuário escolhe marca
//   3. Carrega modelos → usuário escolhe modelo
//   4. Carrega anos    → usuário escolhe ano
//   5. Usuário clica "Consultar" → busca e exibe o preço

document.addEventListener("DOMContentLoaded", () => {

  // Ícone de cada tipo de veículo (para exibir no resultado)
  const TIPO_ICONS = {
    carros:    "🚗",
    motos:     "🏍️",
    caminhoes: "🚛",
  };

  const TIPO_CODES = {
    carros: 1,
    motos: 2,
    caminhoes: 3
  };

  let tabelaRefCache = null;

  async function getTabelaRef() {
    if (!tabelaRefCache) {
      const res = await fetch("/api/fipe-proxy?action=tabelas");
      const data = await res.json();
      tabelaRefCache = data[0].Codigo;
    }
    return tabelaRefCache;
  }

  // ── Estado da aplicação ───────────────────────────────────────────────
  let tipoAtual    = "carros";  // tipo selecionado no momento
  let marcaAtual   = null;      // { codigo, nome }
  let modeloAtual  = null;      // { codigo, nome }
  let anoAtual     = null;      // { codigo, nome }

  // ── Elementos do DOM ─────────────────────────────────────────────────
  const tabs           = document.querySelectorAll(".fipe-tab");
  const selectMarca    = document.getElementById("select-marca");
  const selectModelo   = document.getElementById("select-modelo");
  const selectAno      = document.getElementById("select-ano");
  const loaderMarca    = document.getElementById("loader-marca");
  const loaderModelo   = document.getElementById("loader-modelo");
  const loaderAno      = document.getElementById("loader-ano");
  const btnConsultar   = document.getElementById("btn-consultar");
  const btnConsultarTxt= document.getElementById("btn-consultar-text");
  const fipeResult     = document.getElementById("fipe-result");
  const fipeError      = document.getElementById("fipe-error");
  const fipeErrorMsg   = document.getElementById("fipe-error-msg");
  const btnNovaConsulta= document.getElementById("btn-nova-consulta");
  const btnBuscarAnuncios = document.getElementById("btn-buscar-anuncios");
  const themeToggle    = document.getElementById("theme-toggle");

  // ══════════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ══════════════════════════════════════════════════════════════════════

  function init() {
    // Aplica tema salvo
    const theme = Storage.loadTheme();
    document.body.classList.remove("dark-theme", "light-theme");
    document.body.classList.add(`${theme}-theme`);

    bindEvents();
    carregarMarcas("carros");
  }

  // ══════════════════════════════════════════════════════════════════════
  // EVENTOS
  // ══════════════════════════════════════════════════════════════════════

  function bindEvents() {
    // Alternância de tema
    themeToggle.addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark-theme");
      const newTheme = isDark ? "light" : "dark";
      document.body.classList.remove("dark-theme", "light-theme");
      document.body.classList.add(`${newTheme}-theme`);
      Storage.saveTheme(newTheme);
    });

    // Tabs de tipo de veículo
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tipo = tab.dataset.type;
        if (tipo === tipoAtual) return;

        // Atualiza tab ativa
        tabs.forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        // Reseta selects e carrega novas marcas
        tipoAtual = tipo;
        resetSelects();
        carregarMarcas(tipo);
      });
    });

    // Select de marca
    selectMarca.addEventListener("change", () => {
      const option = selectMarca.options[selectMarca.selectedIndex];
      if (!option.value) return;

      marcaAtual  = { codigo: option.value, nome: option.text };
      modeloAtual = null;
      anoAtual    = null;

      resetSelect(selectModelo, "Carregando modelos...", true);
      resetSelect(selectAno,    "Selecione o modelo primeiro", false);
      atualizarBotao();
      esconderResultado();

      carregarModelos(tipoAtual, option.value);
    });

    // Select de modelo
    selectModelo.addEventListener("change", () => {
      const option = selectModelo.options[selectModelo.selectedIndex];
      if (!option.value) return;

      modeloAtual = { codigo: option.value, nome: option.text };
      anoAtual    = null;

      resetSelect(selectAno, "Carregando anos...", true);
      atualizarBotao();
      esconderResultado();

      carregarAnos(tipoAtual, marcaAtual.codigo, option.value);
    });

    // Select de ano
    selectAno.addEventListener("change", () => {
      const option = selectAno.options[selectAno.selectedIndex];
      if (!option.value) return;

      anoAtual = { codigo: option.value, nome: option.text };
      atualizarBotao();
      esconderResultado();
    });

    // Botão consultar
    btnConsultar.addEventListener("click", handleConsultar);

    // Botão nova consulta
    btnNovaConsulta.addEventListener("click", () => {
      esconderResultado();
      selectAno.value = "";
      anoAtual = null;
      atualizarBotao();
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHAMADAS À API FIPE
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Busca a lista de marcas para o tipo selecionado.
   * @param {string} tipo - "carros" | "motos" | "caminhoes"
   */
  async function carregarMarcas(tipo) {
    setLoader(loaderMarca, true);
    selectMarca.disabled = true;

    try {
      const t = await getTabelaRef();
      const codigoTipo = TIPO_CODES[tipo];
      const res = await fetch(`/api/fipe-proxy?action=marcas&tipo=${codigoTipo}&tabela=${t}`);
      if (!res.ok) throw new Error("Falha ao consultar a API proxy.");
      const dados = await res.json();

      selectMarca.innerHTML = `<option value="">Selecione a marca</option>`;
      dados.forEach((marca) => {
        const opt = document.createElement("option");
        opt.value = marca.Value;
        opt.textContent = marca.Label;
        selectMarca.appendChild(opt);
      });

      selectMarca.disabled = false;
    } catch (err) {
      selectMarca.innerHTML = `<option value="">Erro ao carregar marcas</option>`;
      mostrarErro(`Não foi possível carregar as marcas: ${err.message}`);
    } finally {
      setLoader(loaderMarca, false);
    }
  }

  /**
   * Busca os modelos de uma marca.
   * @param {string} tipo
   * @param {string} codigoMarca
   */
  async function carregarModelos(tipo, codigoMarca) {
    setLoader(loaderModelo, true);

    try {
      const t = await getTabelaRef();
      const codigoTipo = TIPO_CODES[tipo];
      const res = await fetch(`/api/fipe-proxy?action=modelos&tipo=${codigoTipo}&tabela=${t}&marca=${codigoMarca}`);
      if (!res.ok) throw new Error("Falha ao consultar a API proxy.");
      const dados = await res.json();
      const modelos = dados.Modelos || dados;

      selectModelo.innerHTML = `<option value="">Selecione o modelo</option>`;
      modelos.forEach((modelo) => {
        const opt = document.createElement("option");
        opt.value = modelo.Value;
        opt.textContent = modelo.Label;
        selectModelo.appendChild(opt);
      });

      selectModelo.disabled = false;
    } catch (err) {
      selectModelo.innerHTML = `<option value="">Erro ao carregar modelos</option>`;
      mostrarErro(`Não foi possível carregar os modelos: ${err.message}`);
    } finally {
      setLoader(loaderModelo, false);
    }
  }

  /**
   * Busca os anos disponíveis para um modelo.
   * @param {string} tipo
   * @param {string} codigoMarca
   * @param {string} codigoModelo
   */
  async function carregarAnos(tipo, codigoMarca, codigoModelo) {
    setLoader(loaderAno, true);

    try {
      const t = await getTabelaRef();
      const codigoTipo = TIPO_CODES[tipo];
      const res = await fetch(`/api/fipe-proxy?action=anos&tipo=${codigoTipo}&tabela=${t}&marca=${codigoMarca}&modelo=${codigoModelo}`);
      if (!res.ok) throw new Error("Falha ao consultar a API proxy.");
      const dados = await res.json();

      selectAno.innerHTML = `<option value="">Selecione o ano</option>`;
      dados.forEach((ano) => {
        const opt = document.createElement("option");
        opt.value = ano.Value;
        opt.textContent = ano.Label;
        selectAno.appendChild(opt);
      });

      selectAno.disabled = false;
    } catch (err) {
      selectAno.innerHTML = `<option value="">Erro ao carregar anos</option>`;
      mostrarErro(`Não foi possível carregar os anos: ${err.message}`);
    } finally {
      setLoader(loaderAno, false);
    }
  }

  /**
   * Busca o preço FIPE e exibe o resultado.
   */
  async function handleConsultar() {
    if (!marcaAtual || !modeloAtual || !anoAtual) return;

    // Estado de carregamento no botão
    btnConsultar.disabled = true;
    btnConsultarTxt.textContent = "Consultando...";
    esconderResultado();

    try {
      const t = await getTabelaRef();
      const codigoTipo = TIPO_CODES[tipoAtual];
      const res = await fetch(`/api/fipe-proxy?action=valor&tipo=${codigoTipo}&tabela=${t}&marca=${marcaAtual.codigo}&modelo=${modeloAtual.codigo}&anoCombustivel=${anoAtual.codigo}`);
      if (!res.ok) throw new Error("Falha ao consultar a API proxy.");
      const dados = await res.json();

      exibirResultado(dados);
    } catch (err) {
      mostrarErro(`Não foi possível obter o preço FIPE: ${err.message}`);
    } finally {
      btnConsultar.disabled = false;
      btnConsultarTxt.textContent = "Consultar Preço FIPE";
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO DO RESULTADO
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Preenche e exibe o card de resultado com os dados da API.
   *
   * Formato retornado pela API:
   * {
   *   TipoVeiculo: 1,
   *   Valor: "R$ 72.911,00",
   *   Marca: "Hyundai",
   *   Modelo: "HB20 1.0 Sense",
   *   AnoModelo: 2023,
   *   Combustivel: "Gasolina",
   *   CodigoFipe: "005340-7",
   *   MesReferencia: "junho de 2026",
   *   SiglaCombustivel: "G"
   * }
   */
  function exibirResultado(dados) {
    // Preenche os campos do card
    document.getElementById("result-icon").textContent      = TIPO_ICONS[tipoAtual];
    document.getElementById("result-name").textContent      = dados.Modelo || dados.modelo || modeloAtual.nome;
    document.getElementById("result-fuel").textContent      = `${dados.Combustivel || ""} — ${dados.AnoModelo || anoAtual.nome}`;
    document.getElementById("result-price").textContent     = dados.Valor || "–";
    document.getElementById("result-codigo").textContent    = dados.CodigoFipe || "–";
    document.getElementById("result-marca").textContent     = dados.Marca || marcaAtual.nome;
    document.getElementById("result-ano").textContent       = dados.AnoModelo || anoAtual.nome;
    document.getElementById("result-combustivel").textContent = dados.Combustivel || "–";
    document.getElementById("result-mes-ref").textContent   = dados.MesReferencia
      ? `Referência: ${dados.MesReferencia}`
      : "";

    // Configura o botão "Buscar anúncios" para ir ao buscador com o modelo pré-preenchido e os parâmetros FIPE
    const nomeModelo = (dados.Modelo || modeloAtual.nome || "").split(" ").slice(0, 3).join(" ");
    const cleanPriceVal = parseFloat(
      (dados.Valor || "")
        .replace(/R\$\s*/gi, "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "")
    ) || 0;
    btnBuscarAnuncios.href = `index.html?q=${encodeURIComponent(nomeModelo)}&fipe_price=${cleanPriceVal}&fipe_name=${encodeURIComponent(dados.Modelo || modeloAtual.nome)}&fipe_code=${dados.CodigoFipe || ""}`;

    // Exibe o card, esconde erro
    fipeError.classList.add("hidden");
    fipeResult.classList.remove("hidden");

    // Scroll suave até o resultado
    fipeResult.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ══════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ══════════════════════════════════════════════════════════════════════



  /**
   * Reseta todos os selects para o estado inicial.
   */
  function resetSelects() {
    marcaAtual  = null;
    modeloAtual = null;
    anoAtual    = null;

    resetSelect(selectMarca,  "Carregando marcas...",          false);
    resetSelect(selectModelo, "Selecione a marca primeiro",    false);
    resetSelect(selectAno,    "Selecione o modelo primeiro",   false);

    atualizarBotao();
    esconderResultado();
  }

  /**
   * Reseta um select individual.
   * @param {HTMLSelectElement} select
   * @param {string} placeholder
   * @param {boolean} disabled
   */
  function resetSelect(select, placeholder, disabled) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    select.disabled = disabled || true;
  }

  /**
   * Ativa/desativa o botão consultar conforme seleção completa.
   */
  function atualizarBotao() {
    const pronto = marcaAtual && modeloAtual && anoAtual;
    btnConsultar.disabled = !pronto;
  }

  /**
   * Exibe/esconde o spinner de carregamento em um select.
   * @param {HTMLElement} loader
   * @param {boolean} visivel
   */
  function setLoader(loader, visivel) {
    loader.classList.toggle("hidden", !visivel);
    // Oculta a seta enquanto o loader aparece
    const icon = loader.previousElementSibling;
    if (icon && icon.classList.contains("fipe-select-icon")) {
      icon.style.opacity = visivel ? "0" : "1";
    }
  }

  /**
   * Esconde o card de resultado e a mensagem de erro.
   */
  function esconderResultado() {
    fipeResult.classList.add("hidden");
    fipeError.classList.add("hidden");
  }

  /**
   * Exibe a mensagem de erro.
   * @param {string} msg
   */
  function mostrarErro(msg) {
    fipeErrorMsg.textContent = msg;
    fipeError.classList.remove("hidden");
    fipeResult.classList.add("hidden");
    fipeError.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Inicia tudo ───────────────────────────────────────────────────────
  init();
});
