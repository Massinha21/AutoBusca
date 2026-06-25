const fs = require('fs');

// 1. UPDATE index.html
let html = fs.readFileSync('public/index.html', 'utf8');

// Remover botão toggle filtros
html = html.replace(/<button type="button" id="btn-toggle-filters"[\s\S]*?<\/button>/, '');

// Remover a sidebar inteira
html = html.replace(/<aside class="filters-sidebar[\s\S]*?<\/aside>/, '');

fs.writeFileSync('public/index.html', html);


// 2. UPDATE style.css
let css = fs.readFileSync('public/style.css', 'utf8');

// Mudar grid para block no search-results-layout
css = css.replace(
  /\.search-results-layout \{[\s\S]*?\}/,
  `.search-results-layout {\n  display: block;\n  width: 100%;\n  margin-bottom: 3rem;\n}`
);
css = css.replace(
  /@media \(max-width: 900px\) \{[\s\S]*?\.search-results-layout \{[\s\S]*?\}/,
  `@media (max-width: 900px) {\n  .search-results-layout {\n    display: block;\n  }`
);

fs.writeFileSync('public/style.css', css);


// 3. UPDATE app.js
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

// Esvaziar applyFilters (mantendo só ordenação)
const newApplyFilters = `function applyFilters() {
    if (allCars.length === 0) return;
    const enriched = enrichCarsWithFipe(allCars);
    const sorted = sortCars(enriched, sortSelect.value);
    if (sorted.length === 0) {
      UI.renderNoResultsFiltered();
      updateMapMarkersState(new Set());
    } else {
      UI.renderCars(sorted, activeCompareUrls);
      updateMapMarkersState(new Set(sorted.map(c => c.dealer_name)));
    }
  }`;
appJs = appJs.replace(/function applyFilters\(\) \{[\s\S]*?\}\s*(?=function populateFiltersData)/, newApplyFilters + '\n\n  ');

// Esvaziar populateFiltersData
const newPopulate = `function populateFiltersData(cars) {
    // Filtros removidos
  }`;
appJs = appJs.replace(/function populateFiltersData\(cars\) \{[\s\S]*?\}\s*(?=\/\/ ──)/, newPopulate + '\n\n  ');

// Esvaziar initFilters
const newInitFilters = `function initFilters() {
    // Filtros removidos
  }`;
appJs = appJs.replace(/function initFilters\(\) \{[\s\S]*?\}\s*(?=function closeMobileFilters)/, newInitFilters + '\n\n  ');

fs.writeFileSync('public/js/app.js', appJs);

console.log("Filtros removidos com sucesso.");
