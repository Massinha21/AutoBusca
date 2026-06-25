const fs = require('fs');

// 1. UPDATE index.html
let html = fs.readFileSync('public/index.html', 'utf8');

// Remove the camera and voice search buttons and the hidden file input
html = html.replace(/<button type="button" id="upload-img-btn"[\s\S]*?<\/button>/, '');
html = html.replace(/<button type="button" id="voice-search-btn"[\s\S]*?<\/button>/, '');
html = html.replace(/<input type="file" id="image-upload-input"[\s\S]*?>/, '');

fs.writeFileSync('public/index.html', html);

// 2. UPDATE app.js
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

// Remove DOM elements declaration
appJs = appJs.replace(/const uploadImgBtn\s*=\s*document\.getElementById\("upload-img-btn"\);/, '');
appJs = appJs.replace(/const voiceSearchBtn\s*=\s*document\.getElementById\("voice-search-btn"\);/, '');
appJs = appJs.replace(/const imageUploadInput\s*=\s*document\.getElementById\("image-upload-input"\);/, '');

// Remove event listeners for them (we can just regex remove their entire if blocks or lines)
// For uploadImgBtn: if (uploadImgBtn) { uploadImgBtn.addEventListener("click", () => { imageUploadInput.click(); }); }
appJs = appJs.replace(/if\s*\(uploadImgBtn\)[\s\S]*?imageUploadInput\.click\(\);\s*\}/, '');

// For imageUploadInput change event
appJs = appJs.replace(/if\s*\(imageUploadInput\)[\s\S]*?handleImageUpload\(file\);\s*\}\s*\}/, '');

// For voiceSearchBtn
appJs = appJs.replace(/if\s*\(voiceSearchBtn\)[\s\S]*?startVoiceSearch\(\);\s*\}/, '');

// Also remove startVoiceSearch function if it exists
appJs = appJs.replace(/function startVoiceSearch\(\) \{[\s\S]*?\}\s*\}\s*\}/, '');

// Also remove handleImageUpload function if it exists
appJs = appJs.replace(/function handleImageUpload\(file\) \{[\s\S]*?\}\s*(?=\/\/ ──)/, '');

fs.writeFileSync('public/js/app.js', appJs);

console.log("Media search buttons removed.");
