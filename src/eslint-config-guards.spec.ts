// #region Imports
import { describe, it, expect } from 'vitest';
import { ESLint, type Linter } from 'eslint';
import { resolve } from 'node:path';

// #endregion

// #region Helpers
// Guard tests del `eslint.config.js` (Plan 11 F5.3).
// Verifican que las reglas clave siguen aplicadas tras el fix G10:
// un cambio accidental en el flat config que saque `layer-enforcement/*` o
// `no-restricted-imports` de un scope haría fallar estos tests en CI.

const PROJECT_ROOT = resolve(__dirname, '..');
const eslint = new ESLint({ cwd: PROJECT_ROOT });

async function configFor(relativePath: string): Promise<Linter.RulesRecord> {
	const config = await eslint.calculateConfigForFile(resolve(PROJECT_ROOT, relativePath));
	return (config.rules ?? {}) as Linter.RulesRecord;
}

// Severity: 0=off, 1=warn, 2=error
const ERROR = 2;
const WARN = 1;

function severityOf(entry: unknown): number | undefined {
	if (!Array.isArray(entry)) return undefined;
	return entry[0] as number;
}

// Archivo real por capa (existencia verificada al ejecutar los tests).
const SAMPLE = {
	adminComponent:
		'src/app/features/intranet/pages/admin/campus/campus.component.ts',
	adminStore:
		'src/app/features/intranet/pages/admin/attendances/services/attendances-admin.store.ts',
	adminFacade:
		'src/app/features/intranet/pages/admin/classrooms/services/salones-admin.facade.ts',
	profesorComponent:
		'src/app/features/intranet/pages/profesor/attendance/teacher-attendance.component.ts',
	estudianteComponent:
		'src/app/features/intranet/pages/estudiante/attendance/student-attendance.component.ts',
	sharedComponent:
		'src/app/shared/components/devtools/devtools-panel.component.ts',
} as const;
// #endregion

// #region Layer enforcement — imports-error / imports-warn (fix G10)
describe('eslint.config.js — layer-enforcement (fix G10)', () => {
	describe('Components (*.component.ts)', () => {
		it('admin component aplica imports-error', async () => {
			const rules = await configFor(SAMPLE.adminComponent);
			expect(severityOf(rules['layer-enforcement/imports-error'])).toBe(ERROR);
		});

		it('admin component aplica max-lines con límite 300', async () => {
			const rules = await configFor(SAMPLE.adminComponent);
			const entry = rules['max-lines'] as [number, { max: number }];
			expect(entry[0]).toBe(ERROR);
			expect(entry[1]?.max).toBe(300);
		});
	});

	describe('Stores (*.store.ts)', () => {
		it('admin store aplica imports-error', async () => {
			const rules = await configFor(SAMPLE.adminStore);
			expect(severityOf(rules['layer-enforcement/imports-error'])).toBe(ERROR);
		});

		it('admin store aplica no-restricted-syntax (bloquea .subscribe())', async () => {
			const rules = await configFor(SAMPLE.adminStore);
			expect(severityOf(rules['no-restricted-syntax'])).toBe(ERROR);
		});
	});

	describe('Facades (*.facade.ts)', () => {
		it('facade puro aplica imports-error (incluye cross-facade)', async () => {
			const rules = await configFor(SAMPLE.adminFacade);
			expect(severityOf(rules['layer-enforcement/imports-error'])).toBe(ERROR);
		});
	});

	describe('Cross-feature enforcement', () => {
		it('profesor/ aplica imports-warn (severidad warn por diseño)', async () => {
			const rules = await configFor(SAMPLE.profesorComponent);
			expect(severityOf(rules['layer-enforcement/imports-warn'])).toBe(WARN);
		});

		it('estudiante/ aplica imports-error (cross-feature como error)', async () => {
			const rules = await configFor(SAMPLE.estudianteComponent);
			expect(severityOf(rules['layer-enforcement/imports-error'])).toBe(ERROR);
		});
	});

	describe('shared/ (dependencia inversa prohibida)', () => {
		it('shared aplica imports-error (no puede importar features/intranet-shared)', async () => {
			const rules = await configFor(SAMPLE.sharedComponent);
			expect(severityOf(rules['layer-enforcement/imports-error'])).toBe(ERROR);
		});
	});
});
// #endregion

// #region Barrel enforcement — no-restricted-imports (internals protegidos)
describe('eslint.config.js — barrel enforcement', () => {
	it('features/ bloquea internals de storage/auth/session/WAL/cache', async () => {
		const rules = await configFor(SAMPLE.adminComponent);
		const entry = rules['no-restricted-imports'] as [
			number,
			{ patterns: { group: string[]; message: string }[] },
		];
		expect(entry[0]).toBe(ERROR);

		const allPatterns = entry[1].patterns.flatMap((p) => p.group);
		// Patrones canónicos que NO deben desaparecer del config.
		expect(allPatterns.some((g) => g.includes('session-storage'))).toBe(true);
		expect(allPatterns.some((g) => g.includes('auth-api'))).toBe(true);
		expect(allPatterns.some((g) => g.includes('wal-sync-engine'))).toBe(true);
		expect(allPatterns.some((g) => g.includes('cache-version-manager'))).toBe(true);
	});

	it('shared/ también bloquea internals (mismo scope de barrel)', async () => {
		const rules = await configFor(SAMPLE.sharedComponent);
		const entry = rules['no-restricted-imports'] as [
			number,
			{ patterns: { group: string[] }[] },
		];
		expect(entry[0]).toBe(ERROR);
		expect(entry[1].patterns.length).toBeGreaterThan(0);
	});
});
// #endregion

// #region Globals — reglas transversales que no deben desaparecer
describe('eslint.config.js — reglas globales', () => {
	it('prohibe localStorage/sessionStorage fuera de wrappers', async () => {
		const rules = await configFor(SAMPLE.adminComponent);
		expect(severityOf(rules['no-restricted-globals'])).toBe(ERROR);
	});

	it('prohibe document.cookie', async () => {
		const rules = await configFor(SAMPLE.adminComponent);
		expect(severityOf(rules['no-restricted-properties'])).toBe(ERROR);
	});

	it('no-console permite solo error/warn', async () => {
		const rules = await configFor(SAMPLE.adminComponent);
		const entry = rules['no-console'] as [number, { allow: string[] }];
		expect(entry[0]).toBe(ERROR);
		expect(entry[1].allow).toEqual(expect.arrayContaining(['error', 'warn']));
	});
});
// #endregion
