const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Replace CSS Variables for Dark Mode (iOS)
const rootVars = `:root {
  --bg-primary: #000000;
  --bg-card: #1c1c1e;
  --text-primary: #ffffff;
  --text-secondary: #ebebf5;
  --text-muted: #8e8e93;
  --primary: #0a84ff;
  --primary-container: #1c1c1e;
  --on-primary: #ffffff;
  --on-primary-container: #0a84ff;
  --accent: #0a84ff;
  --success: #34c759;
  --danger: #ff453a;
  --warning: #ffd60a;
  
  --border-color: rgba(255,255,255,0.15);
  --border-radius-lg: 16px;
  --border-radius-md: 12px;
  --border-radius-sm: 8px;
  --nav-height: 68px;
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}`;
css = css.replace(/:root\s*\{[^}]+\}/m, rootVars);

// Replace Light Mode Block
const lightMode = `@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #f2f2f7;
    --bg-card: #ffffff;
    --text-primary: #000000;
    --text-secondary: #3c3c43;
    --text-muted: #8e8e93;
    --primary: #007aff;
    --primary-container: #ffffff;
    --on-primary: #ffffff;
    --on-primary-container: #007aff;
    --accent: #007aff;
    --success: #34c759;
    --danger: #ff3b30;
    --warning: #ffcc00;
    --border-color: rgba(0,0,0,0.1);
  }
}`;
css = css.replace(/@media \(prefers-color-scheme: light\)\s*\{[\s\S]*?--chart-legend:\s*[^;]+;\s*\}\s*\}/m, lightMode);

// Update font family
css = css.replace(/font-family:\s*[^;]+;/g, "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;");

// Fix Bottom Nav for iOS
const bottomNavRegex = /\.bottom-nav\s*\{[\s\S]*?\.nav-item\.active\s*\.nav-icon\s*\{[^}]+\}/m;
const iosBottomNav = `.bottom-nav {
  position: fixed;
  bottom: 0;
  width: 100%;
  background: rgba(28, 28, 30, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  justify-content: space-around;
  padding: 12px 8px 24px;
  z-index: 100;
  border-top: 0.5px solid var(--border-color);
}
@media (prefers-color-scheme: light) {
  .bottom-nav {
    background: rgba(255, 255, 255, 0.7);
  }
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-muted);
  background: none;
  border: none;
  font-family: inherit;
  font-size: 10px;
  font-weight: 500;
  gap: 4px;
  width: 64px;
}
.nav-icon {
  font-size: 24px;
  padding: 4px;
  border-radius: 0;
  transition: color 0.2s;
}
.nav-item.active {
  color: var(--primary);
  font-weight: 600;
}
.nav-item.active .nav-icon {
  color: var(--primary);
}`;
css = css.replace(bottomNavRegex, iosBottomNav);

// Update Buttons to iOS Style
const buttonsRegex = /\.btn-primary\s*\{[\s\S]*?\.btn-secondary:active\s*\{[^}]+\}/m;
const iosButtons = `.btn-primary {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 600;
  width: 100%;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:active { opacity: 0.7; }
.btn-secondary {
  background: var(--bg-card);
  color: var(--primary);
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 600;
  width: 100%;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-secondary:active { opacity: 0.7; }`;
css = css.replace(buttonsRegex, iosButtons);

// Remove the Material Symbols override at the bottom and replace with thinner strokes
const materialSymbolsRegex = /\.material-symbols-rounded\s*\{[\s\S]*?opsz'\s*24;\s*\}/m;
const iosMaterialSymbols = `.material-symbols-rounded {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
}`;
if (css.match(materialSymbolsRegex)) {
  css = css.replace(materialSymbolsRegex, iosMaterialSymbols);
} else {
  css += '\n' + iosMaterialSymbols;
}

// Write file
fs.writeFileSync('style.css', css);
console.log('iOS CSS updated successfully');
