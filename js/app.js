// Main App Entry Point
document.addEventListener('DOMContentLoaded', () => {
  // Initialize State
  State.load();
  
  // Initialize UI
  UI.init();

  // Setup Event Listeners
  setupEventListeners();
  
  // Theme Management
  initTheme();
  
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('ServiceWorker registration failed: ', err);
      });
    });
  }
});

function setupEventListeners() {
  // Theme Toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('study_theme', newTheme);
  });

  // Settings Menu Toggle
  document.getElementById('settings-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('settings-menu').classList.toggle('hidden');
  });

  // Close settings when clicking outside
  document.addEventListener('click', () => {
    document.getElementById('settings-menu').classList.add('hidden');
  });

  // --- Button Actions ---
  
  // Onboarding
  document.getElementById('btn-onboard-template').addEventListener('click', () => {
    State.exportConfigTemplate();
  });
  
  document.getElementById('btn-onboard-import').addEventListener('click', () => {
    document.getElementById('file-import-template').click();
  });

  // Settings: Download Template
  document.getElementById('btn-export-template').addEventListener('click', () => {
    State.exportConfigTemplate();
  });

  // Settings: Import Configuration
  document.getElementById('btn-import-template').addEventListener('click', () => {
    document.getElementById('file-import-template').click();
  });

  // Settings: Backup Progress
  document.getElementById('btn-export-progress').addEventListener('click', () => {
    State.exportProgress();
  });

  // Settings: Restore Progress
  document.getElementById('btn-import-progress').addEventListener('click', () => {
    document.getElementById('file-import-progress').click();
  });

  // Settings: Factory Reset
  document.getElementById('btn-reset-app').addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all configurations and progress? This cannot be undone.")) {
      State.factoryReset();
      UI.render();
    }
  });

  // --- File Input Handlers ---
  
  document.getElementById('file-import-template').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (State.importConfig(evt.target.result)) {
        alert("Configuration loaded successfully!");
        UI.render();
      } else {
        alert("Invalid configuration JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  });

  document.getElementById('file-import-progress').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (State.importProgress(evt.target.result)) {
        alert("Progress restored successfully!");
        UI.render();
      } else {
        alert("Invalid progress JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('study_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}
