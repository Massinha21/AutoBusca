const fs = require('fs');

// 1. UPDATE style.css
let css = fs.readFileSync('public/style.css', 'utf8');
css = css.replace(/grid-template-columns:\s*280px 1fr;/g, 'grid-template-columns: 1fr;');
fs.writeFileSync('public/style.css', css);

// 2. UPDATE index.html
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/<button type="button" id="btn-toggle-filters"[\s\S]*?<\/button>/, '');
html = html.replace(/<aside class="filters-sidebar[\s\S]*?<\/aside>/, '');
html = html.replace(/<button type="button" id="upload-img-btn"[\s\S]*?<\/button>/, '');
html = html.replace(/<button type="button" id="voice-search-btn"[\s\S]*?<\/button>/, '');
html = html.replace(/<input type="file" id="image-upload-input"[\s\S]*?>/, '');
html = html.replace(/<button id="btn-login-trigger"[\s\S]*?<\/button>/, '');
html = html.replace(/<div class="modal-overlay" id="login-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');
fs.writeFileSync('public/index.html', html);

// 3. UPDATE app.js
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

// Safeguard all addEventListeners by adding an optional chaining or replacing the block
appJs = appJs.replace(/btnLoginTrigger\.addEventListener/g, 'if(btnLoginTrigger) btnLoginTrigger.addEventListener');
appJs = appJs.replace(/uploadImgBtn\.addEventListener/g, 'if(uploadImgBtn) uploadImgBtn.addEventListener');
appJs = appJs.replace(/voiceSearchBtn\.addEventListener/g, 'if(voiceSearchBtn) voiceSearchBtn.addEventListener');
appJs = appJs.replace(/imageUploadInput\.addEventListener/g, 'if(imageUploadInput) imageUploadInput.addEventListener');
appJs = appJs.replace(/btnToggleFilters\.addEventListener/g, 'if(btnToggleFilters) btnToggleFilters.addEventListener');
appJs = appJs.replace(/btnCloseFilters\.addEventListener/g, 'if(btnCloseFilters) btnCloseFilters.addEventListener');
appJs = appJs.replace(/sidebarOverlay\.addEventListener/g, 'if(sidebarOverlay) sidebarOverlay.addEventListener');

// Override Filter Functions
appJs = appJs.replace(
  /function applyFilters\(\) \{[\s\S]*?UI\.updateResultsCount\(sorted\.length\);\s*\}/,
  `function applyFilters() {
    if (allCars.length === 0) return;
    const enriched = enrichCarsWithFipe(allCars);
    const sorted = sortCars(enriched, sortSelect ? sortSelect.value : 'default');
    if (sorted.length === 0) {
      if(UI && UI.renderNoResultsFiltered) UI.renderNoResultsFiltered();
      updateMapMarkersState(new Set());
    } else {
      if(UI && UI.renderCars) UI.renderCars(sorted, activeCompareUrls);
      updateMapMarkersState(new Set(allCars.map(c => c.dealer_name)));
    }
    if(UI && UI.updateResultsCount) UI.updateResultsCount(sorted.length);
  }`
);

appJs = appJs.replace(/function populateFiltersData\(cars\) \{[\s\S]*?\}\s*(?=function applyFilters)/, 'function populateFiltersData(cars) { return; }\n\n  ');
appJs = appJs.replace(/function initFilters\(\) \{[\s\S]*?\}\s*(?=function closeMobileFilters)/, 'function initFilters() { return; }\n\n  ');
appJs = appJs.replace(/function resetFilters\(\) \{[\s\S]*?\}\s*(?=function resetFiltersUI)/, 'function resetFilters() { applyFilters(); }\n\n  ');
appJs = appJs.replace(/function resetFiltersUI\(\) \{[\s\S]*?\}\s*(?=\/\/ ──)/, 'function resetFiltersUI() { return; }\n\n  ');

fs.writeFileSync('public/js/app.js', appJs);

console.log("Limpeza completada com sucesso e com segurança.");
