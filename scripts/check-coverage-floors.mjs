#!/usr/bin/env node
/**
 * Verifica los pisos de cobertura por tipo de archivo sobre coverage-summary.json (P121 F3).
 *
 * Uso: node scripts/check-coverage-floors.mjs [coverage/coverage-summary.json]
 *
 * Pisos = baseline medido menos 1 punto (statements / branches, en %).
 * Subirlos es un commit deliberado; bajarlos exige justificación escrita en el PR.
 */
import { readFileSync } from 'node:fs';

// categoría -> [piso statements, piso branches]
const FLOORS = {
	logica: [58, 47],
	componentes: [33, 25],
	resto: [54, 52],
	total: [47, 38],
};
const LOGICA = /\.(service|facade|store|guard|interceptor|resolver)\.ts$/;
const COMPONENTE = /\.component\.ts$/;

const summaryPath = process.argv[2] ?? 'coverage/coverage-summary.json';
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

const stats = Object.fromEntries(
	Object.keys(FLOORS).map((c) => [c, { sc: 0, st: 0, bc: 0, bt: 0 }]),
);

for (const [file, data] of Object.entries(summary)) {
	if (file === 'total') continue;
	const name = file.replaceAll('\\', '/');
	const category = LOGICA.test(name) ? 'logica' : COMPONENTE.test(name) ? 'componentes' : 'resto';
	for (const cat of [category, 'total']) {
		const s = stats[cat];
		s.sc += data.statements.covered;
		s.st += data.statements.total;
		s.bc += data.branches.covered;
		s.bt += data.branches.total;
	}
}

let failed = false;
console.log(
	`${'Categoría'.padEnd(14)}${'Statements'.padStart(11)}${'Piso'.padStart(7)}${'Branches'.padStart(10)}${'Piso'.padStart(7)}`,
);
for (const [cat, [floorS, floorB]] of Object.entries(FLOORS)) {
	const s = stats[cat];
	if (s.st === 0) {
		console.log(`${cat.padEnd(14)}sin datos: la categoría no aparece en el resumen`);
		failed = true;
		continue;
	}
	const ps = (100 * s.sc) / s.st;
	const pb = s.bt ? (100 * s.bc) / s.bt : 100;
	const ok = ps >= floorS && pb >= floorB;
	failed ||= !ok;
	console.log(
		`${cat.padEnd(14)}${ps.toFixed(1).padStart(10)}%${String(floorS).padStart(6)}%${pb.toFixed(1).padStart(9)}%${String(floorB).padStart(6)}%  ${ok ? 'OK' : 'POR DEBAJO DEL PISO'}`,
	);
}
process.exit(failed ? 1 : 0);
