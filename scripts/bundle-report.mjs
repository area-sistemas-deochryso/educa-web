#!/usr/bin/env node
/**
 * Bundle analysis script for Angular 21 + esbuild.
 * Measures raw, gzip, and brotli sizes — budgets are on gzip (the wire format).
 *
 * Usage:
 *   bun scripts/bundle-report.mjs            → HTML report + console summary
 *   bun scripts/bundle-report.mjs --check    → exit 1 if initial gzip > budget
 *   bun scripts/bundle-report.mjs --json     → print JSON to stdout
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

// #region Config
const BUDGET_GZIP_WARNING_KB = 300;
const BUDGET_GZIP_ERROR_KB = 350;

const APP_CATEGORIES = [
	{ label: 'Pequeña / Landing', maxGzipKB: 150 },
	{ label: 'Mediana / Gestión', maxGzipKB: 350 },
	{ label: 'Grande / Dashboard', maxGzipKB: 500 },
];

const DIST_DIR = resolve('dist/educa-angular/browser');
const STATS_PATH = resolve('dist/educa-angular/stats.json');
const REPORT_PATH = resolve('dist/bundle-report.html');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const jsonMode = args.includes('--json');

if (!existsSync(DIST_DIR)) {
	console.error('❌ dist/ not found. Run the build first.');
	process.exit(1);
}
// #endregion

// #region Parse stats.json or fall back to file sizes
const hasStats = existsSync(STATS_PATH);
let stats;
if (hasStats) {
	stats = JSON.parse(readFileSync(STATS_PATH, 'utf8'));
}

function groupModule(inputPath) {
	const p = inputPath.replace(/\\/g, '/');
	if (p.includes('node_modules')) {
		const parts = p.split('node_modules/');
		const pkg = parts[parts.length - 1].split('/').slice(0, p.includes('@') ? 2 : 1).join('/');
		return 'node_modules/' + pkg;
	}
	if (p.includes('src/app/')) {
		const parts = p.split('src/app/')[1].split('/');
		return parts[0] === 'features' && parts.length > 2
			? 'src/app/' + parts.slice(0, 3).join('/')
			: 'src/app/' + parts.slice(0, 2).join('/');
	}
	return 'other';
}

function compress(filePath) {
	const content = readFileSync(filePath);
	return {
		rawBytes: content.length,
		gzipBytes: gzipSync(content, { level: 9 }).length,
		brotliBytes: brotliCompressSync(content).length,
	};
}

const jsFiles = readdirSync(DIST_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.server.js'));
const chunks = [];

for (const file of jsFiles) {
	const filePath = join(DIST_DIR, file);
	const { rawBytes, gzipBytes, brotliBytes } = compress(filePath);
	const sources = {};

	if (hasStats && stats.outputs[file]) {
		const inputs = stats.outputs[file].inputs || {};
		for (const [inputPath, { bytesInOutput }] of Object.entries(inputs)) {
			const mod = groupModule(inputPath);
			sources[mod] = (sources[mod] || 0) + bytesInOutput;
		}
	}

	chunks.push({
		file,
		rawKB: +(rawBytes / 1024).toFixed(2),
		gzipKB: +(gzipBytes / 1024).toFixed(2),
		brotliKB: +(brotliBytes / 1024).toFixed(2),
		sources,
	});
}
// #endregion

// #region Classify initial vs lazy
function collectInitialChunks(outputs) {
	const initial = new Set();
	const mainKey = Object.keys(outputs).find(k => /^main(-[^.]+)?\.js$/.test(k));
	if (!mainKey) return initial;
	initial.add(mainKey);
	const polyfillsKey = Object.keys(outputs).find(k => /^polyfills(-[^.]+)?\.js$/.test(k));
	if (polyfillsKey) initial.add(polyfillsKey);

	function walk(key) {
		const entry = outputs[key];
		if (!entry?.imports) return;
		for (const imp of entry.imports) {
			if (imp.kind === 'import-statement' && !initial.has(imp.path)) {
				initial.add(imp.path);
				walk(imp.path);
			}
		}
	}
	walk(mainKey);
	return initial;
}

let initialSet;
if (hasStats) {
	initialSet = collectInitialChunks(stats.outputs);
} else {
	const mainFile = jsFiles.find(f => f === 'main.js' || f.startsWith('main-'));
	initialSet = new Set();
	if (mainFile) {
		initialSet.add(mainFile);
		const mainContent = readFileSync(join(DIST_DIR, mainFile), 'utf8');
		for (const m of mainContent.matchAll(/import\(["']\.\/([^"']+)["']\)/g)) {
			initialSet.add(m[1]);
		}
		const polyfills = jsFiles.find(f => /^polyfills(-[^.]+)?\.js$/.test(f));
		if (polyfills) initialSet.add(polyfills);
	}
}

for (const c of chunks) {
	c.initial = initialSet.has(c.file);
}

const initial = chunks.filter(c => c.initial).sort((a, b) => b.gzipKB - a.gzipKB);
const lazy = chunks.filter(c => !c.initial).sort((a, b) => b.gzipKB - a.gzipKB);

function sumField(list, field) {
	return +list.reduce((s, c) => s + c[field], 0).toFixed(2);
}

const totals = {
	initial: { rawKB: sumField(initial, 'rawKB'), gzipKB: sumField(initial, 'gzipKB'), brotliKB: sumField(initial, 'brotliKB') },
	lazy: { rawKB: sumField(lazy, 'rawKB'), gzipKB: sumField(lazy, 'gzipKB'), brotliKB: sumField(lazy, 'brotliKB') },
};
totals.all = {
	rawKB: +(totals.initial.rawKB + totals.lazy.rawKB).toFixed(2),
	gzipKB: +(totals.initial.gzipKB + totals.lazy.gzipKB).toFixed(2),
	brotliKB: +(totals.initial.brotliKB + totals.lazy.brotliKB).toFixed(2),
};

function classifyApp(gzipKB) {
	for (const cat of APP_CATEGORIES) {
		if (gzipKB <= cat.maxGzipKB) return cat.label;
	}
	return 'Muy grande (>500 kB gzip)';
}
// #endregion

// #region JSON mode
if (jsonMode) {
	console.log(JSON.stringify({
		totals,
		budget: { warningKB: BUDGET_GZIP_WARNING_KB, errorKB: BUDGET_GZIP_ERROR_KB },
		category: classifyApp(totals.initial.gzipKB),
		initial,
		lazy,
	}, null, 2));
	process.exit(0);
}
// #endregion

// #region Console summary
const gzipKB = totals.initial.gzipKB;
const status = gzipKB > BUDGET_GZIP_ERROR_KB ? '🔴' : gzipKB > BUDGET_GZIP_WARNING_KB ? '🟡' : '🟢';

console.log('');
console.log(`  ${status} Initial bundle (what reaches the browser):`);
console.log(`     Raw:    ${totals.initial.rawKB.toFixed(1).padStart(8)} kB`);
console.log(`     Gzip:   ${totals.initial.gzipKB.toFixed(1).padStart(8)} kB  ← budget: ${BUDGET_GZIP_WARNING_KB} kB warn / ${BUDGET_GZIP_ERROR_KB} kB error`);
console.log(`     Brotli: ${totals.initial.brotliKB.toFixed(1).padStart(8)} kB  ← Netlify default`);
console.log('');
console.log(`  📦 Lazy chunks: ${totals.lazy.gzipKB.toFixed(1)} kB gzip (${lazy.length} chunks)`);
console.log(`  📊 Total app:   ${(totals.all.rawKB / 1024).toFixed(2)} MB raw / ${(totals.all.gzipKB / 1024).toFixed(2)} MB gzip`);
console.log(`  🏷️  Categoría:   ${classifyApp(gzipKB)}`);
if (!hasStats) console.log('  ℹ️  No stats.json — run with --stats-json for module breakdown.');
console.log('');

if (initial.length > 0) {
	console.log('  Initial chunks:');
	console.log('    ' + 'Raw'.padStart(9) + 'Gzip'.padStart(9) + 'Brotli'.padStart(9) + '  File');
	console.log('    ' + '-'.repeat(55));
	for (const c of initial) {
		const top = Object.entries(c.sources).sort((a, b) => b[1] - a[1])[0];
		const topLabel = top ? `← ${top[0]} (${(top[1] / 1024).toFixed(1)} kB)` : '';
		console.log(
			'    ' +
			(c.rawKB.toFixed(1) + ' kB').padStart(9) +
			(c.gzipKB.toFixed(1) + ' kB').padStart(9) +
			(c.brotliKB.toFixed(1) + ' kB').padStart(9) +
			`  ${c.file}  ${topLabel}`,
		);
	}
	console.log('');
}

if (gzipKB > BUDGET_GZIP_ERROR_KB) {
	console.log(`  ⚠️  Over error budget by ${(gzipKB - BUDGET_GZIP_ERROR_KB).toFixed(1)} kB gzip`);
	console.log('');
} else if (gzipKB > BUDGET_GZIP_WARNING_KB) {
	console.log(`  ⚠️  Over warning threshold by ${(gzipKB - BUDGET_GZIP_WARNING_KB).toFixed(1)} kB gzip`);
	console.log('');
}
// #endregion

// #region HTML report
function severity(gzip) {
	if (gzip > 50) return '#ef4444';
	if (gzip > 20) return '#f59e0b';
	if (gzip > 10) return '#3b82f6';
	return '#22c55e';
}

function chunkRows(list) {
	return list.map(r => {
		const color = severity(r.gzipKB);
		const srcCount = Object.keys(r.sources).length;
		const topSources = Object.entries(r.sources).sort((a, b) => b[1] - a[1]).slice(0, 5)
			.map(([m, b]) => m.replace('node_modules/', '📦 ').replace('src/app/', '📁 ') + ' (' + (b / 1024).toFixed(1) + ' kB)')
			.join('<br>');
		return `<tr>
			<td><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${color}"></span> ${r.file}</td>
			<td style="text-align:right">${r.rawKB.toFixed(1)} kB</td>
			<td style="text-align:right;font-weight:bold">${r.gzipKB.toFixed(1)} kB</td>
			<td style="text-align:right">${r.brotliKB.toFixed(1)} kB</td>
			<td>${srcCount}</td>
			<td style="font-size:0.85em">${topSources}</td>
		</tr>`;
	}).join('');
}

const byModule = {};
for (const r of chunks) {
	for (const [mod, bytes] of Object.entries(r.sources)) {
		byModule[mod] = (byModule[mod] || 0) + bytes;
	}
}
const moduleRows = Object.entries(byModule).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([mod, bytes]) => {
	const kb = (bytes / 1024).toFixed(1);
	const inInitial = initial.some(r => r.sources[mod]);
	const badge = inInitial
		? '<span style="background:#ef4444;color:white;padding:1px 6px;border-radius:4px;font-size:0.75em">INITIAL</span>'
		: '<span style="background:#22c55e;color:white;padding:1px 6px;border-radius:4px;font-size:0.75em">LAZY</span>';
	return `<tr><td>${mod} ${badge}</td><td style="text-align:right;font-weight:bold">${kb} kB</td></tr>`;
}).join('');

const budgetPct = Math.min(100, (gzipKB / BUDGET_GZIP_ERROR_KB) * 100);
const budgetColor = gzipKB > BUDGET_GZIP_ERROR_KB ? '#ef4444' : gzipKB > BUDGET_GZIP_WARNING_KB ? '#f59e0b' : '#22c55e';
const warnPct = (BUDGET_GZIP_WARNING_KB / BUDGET_GZIP_ERROR_KB) * 100;
const budgetBar = `<div style="margin:12px 0;background:#334155;border-radius:8px;height:24px;position:relative;overflow:hidden">
	<div style="width:${budgetPct}%;height:100%;background:${budgetColor};border-radius:8px;transition:width 0.3s"></div>
	<div style="position:absolute;left:${warnPct}%;top:0;bottom:0;width:2px;background:#f59e0b80" title="Warning: ${BUDGET_GZIP_WARNING_KB} kB"></div>
	<span style="position:absolute;right:8px;top:2px;font-size:0.85em">${gzipKB.toFixed(0)} / ${BUDGET_GZIP_ERROR_KB} kB gzip</span>
</div>`;

const statsNote = hasStats ? '' : '<p style="color:#f59e0b">⚠️ No stats.json — module breakdown unavailable. Build with <code>--stats-json</code> for full detail.</p>';

const compressionRatio = ((1 - totals.initial.gzipKB / totals.initial.rawKB) * 100).toFixed(1);
const brotliRatio = ((1 - totals.initial.brotliKB / totals.initial.rawKB) * 100).toFixed(1);

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bundle Report</title>
<style>body{font-family:system-ui;max-width:1200px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0}h1,h2,h3{color:#f8fafc}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 12px;border:1px solid #334155;text-align:left}th{background:#1e293b}tr:hover{background:#1e293b}.card{background:#1e293b;border-radius:12px;padding:20px;margin:16px 0}.metric{font-size:2em;font-weight:bold}.sub{font-size:0.85em;color:#94a3b8;margin-top:4px}.tabs{display:flex;gap:8px;margin:20px 0}.tab{padding:10px 20px;background:#334155;border:none;color:#e2e8f0;border-radius:8px;cursor:pointer;font-size:1em}.tab.active{background:#3b82f6}.panel{display:none}.panel.active{display:block}.compare{display:flex;gap:20px;flex-wrap:wrap}.compare .card{flex:1;min-width:200px;text-align:center}code{background:#334155;padding:2px 6px;border-radius:4px}.cat-badge{display:inline-block;padding:4px 12px;border-radius:16px;font-size:0.85em;font-weight:600}</style></head><body>
<h1>Bundle Report</h1>${statsNote}
<h3>Budget (gzip)</h3>${budgetBar}
<div class="compare">
	<div class="card">
		<div>Initial Bundle</div>
		<div class="metric" style="color:${budgetColor}">${gzipKB.toFixed(0)} kB</div>
		<div class="sub">gzip · ${totals.initial.brotliKB.toFixed(0)} kB brotli · ${totals.initial.rawKB.toFixed(0)} kB raw</div>
		<div class="sub">Compression: gzip ${compressionRatio}% · brotli ${brotliRatio}%</div>
	</div>
	<div class="card">
		<div>Lazy Chunks</div>
		<div class="metric">${totals.lazy.gzipKB.toFixed(0)} kB</div>
		<div class="sub">gzip · ${lazy.length} chunks · ${totals.lazy.rawKB.toFixed(0)} kB raw</div>
	</div>
	<div class="card">
		<div>Total App</div>
		<div class="metric">${(totals.all.gzipKB / 1024).toFixed(2)} MB</div>
		<div class="sub">gzip · ${(totals.all.rawKB / 1024).toFixed(2)} MB raw</div>
	</div>
	<div class="card">
		<div>Categoría</div>
		<div style="margin-top:12px"><span class="cat-badge" style="background:${budgetColor}20;color:${budgetColor}">${classifyApp(gzipKB)}</span></div>
		<div class="sub" style="margin-top:8px">Rangos gzip: pequeña &lt;150 kB · mediana &lt;350 kB · grande &lt;500 kB</div>
	</div>
</div>
<div class="tabs">
	<button class="tab active" onclick="showTab(0)">Initial (${initial.length})</button>
	<button class="tab" onclick="showTab(1)">Lazy (top 30)</button>
	<button class="tab" onclick="showTab(2)">By Module (top 40)</button>
</div>
<div class="panel active" id="p0"><table><tr><th>Chunk</th><th>Raw</th><th>Gzip</th><th>Brotli</th><th>Modules</th><th>Top Sources</th></tr>${chunkRows(initial)}</table></div>
<div class="panel" id="p1"><table><tr><th>Chunk</th><th>Raw</th><th>Gzip</th><th>Brotli</th><th>Modules</th><th>Top Sources</th></tr>${chunkRows(lazy.slice(0, 30))}</table></div>
<div class="panel" id="p2"><table><tr><th>Module</th><th>Total Size (raw)</th></tr>${moduleRows}</table></div>
<script>function showTab(n){document.querySelectorAll(".panel").forEach((p,i)=>{p.classList.toggle("active",i===n)});document.querySelectorAll(".tab").forEach((t,i)=>{t.classList.toggle("active",i===n)})}</script>
</body></html>`;

writeFileSync(REPORT_PATH, html);
console.log(`  📄 Report: ${REPORT_PATH}`);
// #endregion

// #region Check mode
if (checkMode && gzipKB > BUDGET_GZIP_ERROR_KB) {
	process.exit(1);
}
// #endregion
