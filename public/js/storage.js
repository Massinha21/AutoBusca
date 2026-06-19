// public/js/storage.js
//
// Responsável por SALVAR e CARREGAR dados no localStorage do navegador.
// Isso permite que o usuário não precise redigitar as URLs das revendas
// a cada vez que abre o site.
//
// Também armazena a preferência de tema (dark/light) do usuário.
//
// Uso:
//   Storage.saveUrls(["https://site1.com", "https://site2.com"])
//   Storage.loadUrls()   → ["https://site1.com", "https://site2.com"]
//   Storage.saveTheme("dark")
//   Storage.loadTheme()  → "dark"

const Storage = (() => {
  // Chaves usadas no localStorage
  const KEYS = {
    URLS:  "autobusca:urls",
    THEME: "autobusca:theme",
    VIEW:  "autobusca:view",
  };

  // Lista padrão de revendas já conhecidas
  // Na Fase 2+, cada uma dessas URLs terá um parser correspondente em /api/parsers/
  const DEFAULT_URLS = [
    "https://amfveiculos.com.br",
    "https://savinhomotors.com.br",
    "https://www.ramiroveiculos.com",
    "https://autoprimerp.com.br",
    "https://www.copaveiculos.com.br",
    "https://www.automaisveiculosribeirao.com.br",
    "https://valvechveiculos.com.br",
    "https://glveiculos.com.br",
    "https://www.krveiculos.com.br",
    "https://www.baseveiculos.com.br",
    "https://rossiveiculos.com.br",
    "http://www.seminovosribeiraoveiculos.com.br",
    "https://tcamotors.com.br",
    "https://www.holfautos.com",
    "https://www.mmveiculosrp.com.br",
    // 9 Novas URLs Cadastradas
    "https://kitoveiculos.com.br",
    "https://www.bolsadeveiculo.com.br",
    "http://www.cemveiculos.com.br",
    "http://www.cristalveiculosrp.com.br",
    "https://sandiegoveiculos.com.br",
    "https://hiperauto.com.br",
    "https://tharleyveiculos.com.br",
    "https://mixveiculosribeirao.com.br",
    "https://lexcarmultimarcas.com.br",
  ];

  /**
   * Salva a lista de URLs no localStorage.
   * Recebe um array de strings ou uma string com quebras de linha.
   *
   * @param {string[]|string} urls
   */
  function saveUrls(urls) {
    let urlArray = Array.isArray(urls) ? urls : parseUrlText(urls);
    // Remove entradas vazias antes de salvar
    urlArray = urlArray.filter((u) => u.trim() !== "");
    localStorage.setItem(KEYS.URLS, JSON.stringify(urlArray));
  }

  /**
   * Carrega a lista de URLs salva.
   * Se nunca foi salvo nada, retorna um array vazio.
   *
   * @returns {string[]}
   */
  function loadUrls() {
    try {
      const raw = localStorage.getItem(KEYS.URLS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Retorna a lista de revendas padrão do projeto.
   * Útil para o botão "Carregar revendas padrão".
   *
   * @returns {string[]}
   */
  function getDefaultUrls() {
    return [...DEFAULT_URLS];
  }

  /**
   * Converte um texto com URLs separadas por quebra de linha em array.
   * Ignora linhas em branco e linhas que começam com "#" (comentários).
   *
   * @param {string} text
   * @returns {string[]}
   */
  function parseUrlText(text) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
  }

  /**
   * Converte array de URLs em texto para exibir no textarea.
   *
   * @param {string[]} urls
   * @returns {string}
   */
  function urlsToText(urls) {
    return urls.join("\n");
  }

  /**
   * Salva a preferência de tema do usuário.
   * @param {"dark"|"light"} theme
   */
  function saveTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
  }

  /**
   * Carrega a preferência de tema do usuário.
   * Retorna "dark" como padrão se nunca foi salvo.
   *
   * @returns {"dark"|"light"}
   */
  function loadTheme() {
    return localStorage.getItem(KEYS.THEME) || "dark";
  }

  /**
   * Salva a preferência de visualização de resultados (grid/list).
   * @param {"grid"|"list"} view
   */
  function saveView(view) {
    localStorage.setItem(KEYS.VIEW, view);
  }

  /**
   * Carrega a preferência de visualização de resultados do usuário.
   * @returns {"grid"|"list"}
   */
  function loadView() {
    return localStorage.getItem(KEYS.VIEW) || "grid";
  }

  // Expõe apenas as funções necessárias para os outros módulos
  return {
    saveUrls,
    loadUrls,
    getDefaultUrls,
    parseUrlText,
    urlsToText,
    saveTheme,
    loadTheme,
    saveView,
    loadView,
  };
})();
