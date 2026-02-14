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
			'@test': resolve(__dirname, 'src/test-setup'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.spec.ts'],
		exclude: ['**/dist/**', 'node_modules/**'],
		setupFiles: ['src/test-setup.ts'],
		server: {
			deps: {
				inline: [/@angular/, /@primeng/, /primeng/],
			},
		},
	},
});
// #endregion
