// #region Imports
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'path';

// #endregion
// #region Implementation
export default defineConfig({
	plugins: [angular()],
	resolve: {
		alias: {
			'@app': resolve(__dirname, 'src/app'),
			'@core': resolve(__dirname, 'src/app/core'),
			'@shared': resolve(__dirname, 'src/app/shared'),
			'@features': resolve(__dirname, 'src/app/features'),
			'@config': resolve(__dirname, 'src/app/config'),
			'@env': resolve(__dirname, 'src/app/config'),
			'@data': resolve(__dirname, 'src/app/data'),
			'@intranet-shared': resolve(__dirname, 'src/app/features/intranet/shared'),
			'@test': resolve(__dirname, 'src/test-setup'),
			'@edu-ui': resolve(__dirname, 'src/app/shared/edu-ui/public-api'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.spec.ts'],
		exclude: ['**/dist/**', 'node_modules/**'],
		setupFiles: ['src/test-setup.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['**/*.spec.ts', 'src/app/shared/edu-ui/**'],
			reporter: ['text-summary', 'json-summary'],
			// P121 F3 — pisos de cobertura (F2): baseline medido menos 1 punto.
			// statements/branches son las métricas del plan; functions/lines se declaran para consistencia.
			// Un umbral por glob excluiría esos archivos del umbral global (ver observación F2 §6),
			// por lo tanto se aplica un único umbral global; la verificación por categoría (logica/componentes/resto)
			// corre aparte mediante scripts/check-coverage-floors.mjs en CI.
			thresholds: {
				statements: 47,
				branches: 38,
			},
		},
		server: {
			deps: {
				inline: [/@angular/],
			},
		},
	},
});
// #endregion
