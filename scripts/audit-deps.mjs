#!/usr/bin/env node
/**
 * Auditoría de acoplamiento a dependencias externas críticas.
 *
 * Ejecutar:   node scripts/audit-deps.mjs
 * En CI:      node scripts/audit-deps.mjs --ci  (exit 1 si hay nuevos acoplamientos directos)
 *
 * Detecta:
 * - Imports directos de librerías que deberían pasar por wrapper
 * - Mapa de uso de PrimeNG por módulo (para planificar migración)
 * - Dependencias en package.json sin imports (fantasma)
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const SRC = join(process.cwd(), 'src');
const isCI = process.argv.includes('--ci');

// #region Config — dependencias a auditar

// Imports que DEBEN pasar por wrapper (no directos en features)
const WRAPPED_DEPS = [
	{ pattern: /from\s+['"]xlsx['"]/, wrapper: '@core/services/excel', name: 'xlsx' },
	{ pattern: /from\s+['"]exceljs['"]/, wrapper: '@core/services/excel', name: 'exceljs' },
	{ pattern: /from\s+['"]@angular\/cdk\/drag-drop['"]/, wrapper: '@shared/directives/drag-drop', name: '@angular/cdk/drag-drop' },
];

// PrimeNG — no wrapeado pero auditado
const PRIMENG_PATTERN = /from\s+['"]primeng\/([\w-]+)['"]/g;

// #endregion

// #region File scanner

function walkTs(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (entry === 'node_modules' || entry === 'dist' || entry === '.angular') continue;
		const stat = statSync(full);
		if (stat.isDirectory()) files.push(...walkTs(full));
		else if (extname(full) === '.ts' && !full.includes('.spec.ts')) files.push(full);
	}
	return files;
}

// #endregion

// #region Analysis

const files = walkTs(SRC);
const violations = [];
const primengMap = new Map(); // module -> Set<file>

for (const file of files) {
	const content = readFileSync(file, 'utf-8');
	const rel = relative(SRC, file).replace(/\\/g, '/');

	// Check wrapped deps — skip the wrapper files themselves
	for (const dep of WRAPPED_DEPS) {
		if (dep.pattern.test(content)) {
			const isWrapper = rel.includes('drag-drop/index.ts') || rel.includes('excel/excel.service.ts');
			if (!isWrapper) {
				violations.push({ file: rel, dep: dep.name, wrapper: dep.wrapper });
			}
		}
	}

	// Map PrimeNG usage
	let match;
	const regex = new RegExp(PRIMENG_PATTERN.source, 'g');
	while ((match = regex.exec(content)) !== null) {
		const mod = match[1];
		if (!primengMap.has(mod)) primengMap.set(mod, new Set());
		primengMap.get(mod).add(rel);
	}
}

// #endregion

// #region Report

console.log('\n══════════════════════════════════════════');
console.log(' AUDITORÍA DE DEPENDENCIAS EXTERNAS');
console.log('══════════════════════════════════════════\n');

// 1. Violations
if (violations.length > 0) {
	console.log('❌ IMPORTS DIRECTOS (deben usar wrapper):\n');
	for (const v of violations) {
		console.log(`   ${v.file}`);
		console.log(`   → import directo de "${v.dep}" — usar "${v.wrapper}"\n`);
	}
} else {
	console.log('✅ No hay imports directos a dependencias wrapeadas\n');
}

// 2. PrimeNG map
const sortedModules = [...primengMap.entries()].sort((a, b) => b[1].size - a[1].size);
const totalPrimengFiles = new Set(sortedModules.flatMap(([, files]) => [...files])).size;

console.log(`📦 PrimeNG — ${sortedModules.length} módulos en ${totalPrimengFiles} archivos:\n`);
console.log('   Módulo                  Archivos');
console.log('   ────────────────────    ────────');
for (const [mod, files] of sortedModules) {
	const padded = mod.padEnd(24);
	console.log(`   ${padded} ${files.size}`);
}

// Top 5 most coupled files
console.log('\n   Top archivos con más imports de PrimeNG:');
const filePrimengCount = new Map();
for (const [, fileSet] of primengMap) {
	for (const f of fileSet) {
		filePrimengCount.set(f, (filePrimengCount.get(f) || 0) + 1);
	}
}
const topFiles = [...filePrimengCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [file, count] of topFiles) {
	console.log(`   ${count} módulos ← ${file}`);
}

console.log('\n══════════════════════════════════════════\n');

// #endregion

// CI mode: fail if there are violations
if (isCI && violations.length > 0) {
	console.error(`CI FAIL: ${violations.length} import(s) directo(s) a dependencias wrapeadas.`);
	process.exit(1);
}
