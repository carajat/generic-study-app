const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Update variables
const rootVars = `:root {
  --bg-primary: #131314;
  --bg-card: #1E1F20;
  --text-primary: #e3e3e3;
  --text-secondary: #c4c7c5;
  --text-muted: #8e918f;
  --primary: #a8c7fa;
  --primary-container: #004a77;
  --on-primary: #062e6f;
  --on-primary-container: #c2e7ff;
  --accent: #a8c7fa;
  --success: #81c995;
  --danger: #f28b82;
  --warning: #fdd663;
  
  --border-color: rgba(255,255,255,0.1);
  --border-radius-lg: 16px;
  --border-radius-md: 12px;
  --border-radius-sm: 8px;
}`;
css = css.replace(/:root\s*\{[^}]+\}/m, rootVars);

// Update font family
css = css.replace(/font-family: 'Inter'/g, "font-family: 'Roboto'");

// Replace .glass-card styles
const glassCard = `.glass-card {
  background: var(--bg-card);
  border-radius: var(--border-radius-lg);
  padding: 16px;
  margin: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}`;
css = css.replace(/\.glass-card\s*\{[^}]+\}/m, glassCard);

// Bottom nav styling
const bottomNav = `.bottom-nav {
  position: fixed;
  bottom: 0;
  width: 100%;
  background: var(--bg-card);
  display: flex;
  justify-content: space-around;
  padding: 12px 8px 24px;
  z-index: 100;
  border-top: 1px solid var(--border-color);
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-secondary);
  background: none;
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  gap: 4px;
  width: 64px;
}
.nav-icon {
  font-size: 24px;
  padding: 4px 16px;
  border-radius: 16px;
  transition: background-color 0.2s, color 0.2s;
}
.nav-item.active {
  color: var(--primary);
  font-weight: 700;
}
.nav-item.active .nav-icon {
  background: var(--primary-container);
  color: var(--on-primary-container);
}`;
css = css.replace(/\.bottom-nav\s*\{[\s\S]*?\.nav-item\.active\s*\{[^}]+\}/m, bottomNav);

// Button styling
const btnPrimary = `.btn-primary {
  background: var(--primary);
  color: var(--on-primary);
  border: none;
  padding: 12px 24px;
  border-radius: 100px;
  font-weight: 600;
  width: 100%;
  font-size: 15px;
}`;
css = css.replace(/\.btn-primary\s*\{[^}]+\}/m, btnPrimary);

const btnSecondary = `.btn-secondary {
  background: var(--bg-primary);
  color: var(--primary);
  border: 1px solid var(--border-color);
  padding: 12px 24px;
  border-radius: 100px;
  font-weight: 600;
  width: 100%;
  font-size: 15px;
}`;
css = css.replace(/\.btn-secondary\s*\{[^}]+\}/m, btnSecondary);

// Add Material Symbols rule if it doesn't exist
if (!css.includes('.material-symbols-rounded')) {
  css += `\n\n.material-symbols-rounded {\n  font-variation-settings:\n  'FILL' 1,\n  'wght' 400,\n  'GRAD' 0,\n  'opsz' 24;\n}\n`;
}
if (!css.includes('.icon-sm')) {
  css += `.icon-sm { font-size: 18px; }\n`;
}

fs.writeFileSync('style.css', css);
console.log('CSS updated successfully');
