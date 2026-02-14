// #region Implementation
// !!!!! NO BORRAR ESTE ARCHIVO JAMÃS

const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist/educa-angular/browser');
const indexPath = path.join(distDir, 'index.html');
const loaderPath = path.join(distDir, 'loader.html');

if (!fs.existsSync(indexPath)) {
	console.error('[make-loader] No existe:', indexPath);
	process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');

// Loader inline + auto-remove cuando Angular renderiza
const loaderMarkup = `
<app-root>
  <style>
    /* Fuerza full-width SOLO durante el loader */
    html, body {
      margin: 0;
      width: 100%;
      max-width: none !important;
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
        Roboto, Arial, sans-serif;
    }

    /* Neutraliza cualquier container heredado */
    app-root,
    #boot-loader {
      width: 100vw;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .boot-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #555;
      min-height: 100vh;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .text {
      font-size: 14px;
      letter-spacing: 0.2px;
    }
  </style>

  <div id="boot-loader" class="boot-loader">
    <div class="spinner"></div>
    <div class="text" aria-live="polite">Cargandoâ€¦</div>
  </div>

  <script>
    (function () {
      var maxMs = 15000;
      var start = Date.now();

      function done() {
        var el = document.getElementById('boot-loader');
        if (el) el.remove();
      }

      function tick() {
        if (document.querySelector('[ng-version]')) return done();
        if (Date.now() - start > maxMs) return;
        requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    })();
  </script>
</app-root>
`;

// Reemplaza el primer <app-root>...</app-root>
const out = html.replace(/<app-root[\s\S]*?<\/app-root>/, loaderMarkup);

fs.writeFileSync(loaderPath, out, 'utf8');
console.log('[make-loader] Generado:', loaderPath);
// #endregion
