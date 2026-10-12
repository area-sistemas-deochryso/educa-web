// #region Imports
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

// #endregion
// #region Helpers
const SRC_ROOT = resolve(__dirname, '..', '..');
// Scanning every source file is I/O heavy; the default 5s is not enough when the suite runs in parallel.
const SCAN_TIMEOUT_MS = 30_000;

// Stems (infinitive without -ar/-er/-ir) of the verbs the UI copy uses. A stem + the voseo ending is a
// violation: imperative `${stem}á|é|í` ("Creá", "Hacé", "Elegí") and indicative `${stem}ás|és|ís`
// ("necesitás", "tenés", "escribís"). The copy is written for a school in Peru: tuteo only (H22).
const AR_STEMS = [
	'actualiz', 'agreg', 'apret', 'asign', 'busc', 'cambi', 'cancel', 'carg', 'cerr', 'complet',
	'configur', 'confirm', 'contact', 'cre', 'declar', 'descarg', 'desactiv', 'activ', 'edit', 'elimin', 'envi',
	'esper', 'explic', 'export', 'gener', 'guard', 'import', 'ingres', 'inici', 'intent', 'liber', 'marc', 'mir',
	'necesit', 'pas', 'paus', 'prob', 'reconect', 'recarg', 'refin', 'regist', 'reintent', 'revis', 'seleccion',
	'tip', 'us', 'verific',
];
const ER_STEMS = ['deb', 'hac', 'manten', 'pod', 'pon', 'quer', 'sab', 'ten', 'volv'];
const IR_STEMS = ['abr', 'compart', 'decid', 'eleg', 'escrib', 'ped', 'recib', 'segu', 'sub'];

const VOSEO_FORMS = [
	...AR_STEMS.flatMap((s) => [`${s}á`, `${s}ás`]),
	...ER_STEMS.flatMap((s) => [`${s}é`, `${s}és`]),
	...IR_STEMS.flatMap((s) => [`${s}í`, `${s}ís`]),
	'vos',
	'sos',
];
const VOSEO_REGEX = new RegExp(`(?<![\\p{L}])(?:${VOSEO_FORMS.join('|')})(?![\\p{L}])`, 'giu');
// "franja" is internal jargon for a class slot (H07); UI copy says "este curso" / "clase". Code comments and
// identifiers (`registroDeLaFranja`) may keep it, so only quoted/visible phrases are checked.
const FRANJA_REGEX = /(?<![\p{L}])(?:esta|esa|la|las|de) franjas?(?![\p{L}])|>Franjas?:?<|'Franjas? [\p{L} ]+'/giu;
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*|<!--)/;

// "acá" is rioplatense; the UI says "aquí". Checked only in templates (code comments may say "acá").
const ACA_REGEX = /(?<![\p{L}])acá(?![\p{L}])/giu;

function collectSourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) return collectSourceFiles(full);
		const isSource = /\.(ts|html)$/.test(full) && !full.endsWith('.spec.ts');
		return isSource ? [full] : [];
	});
}

function findVoseo(text: string): string[] {
	return [...text.matchAll(VOSEO_REGEX)].map((m) => m[0]);
}

function findFranja(text: string): string[] {
	return text
		.split('\n')
		.filter((line) => !COMMENT_LINE.test(line))
		.flatMap((line) => [...line.matchAll(FRANJA_REGEX)].map((m) => m[0]));
}

function findAca(html: string): string[] {
	return [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(ACA_REGEX)].map((m) => m[0]);
}

// #endregion
// #region Tests
describe('UI copy voice (H22: tuteo, never voseo)', () => {
	it('has no voseo forms in any source file', () => {
		const violations: string[] = [];
		for (const file of collectSourceFiles(SRC_ROOT)) {
			const found = findVoseo(readFileSync(file, 'utf8'));
			if (found.length > 0) violations.push(`${relative(SRC_ROOT, file)}: ${[...new Set(found)].join(', ')}`);
		}
		expect(violations).toEqual([]);
	}, SCAN_TIMEOUT_MS);

	it('uses "aquí" instead of "acá" in templates', () => {
		const violations: string[] = [];
		for (const file of collectSourceFiles(SRC_ROOT).filter((f) => f.endsWith('.html'))) {
			const found = findAca(readFileSync(file, 'utf8'));
			if (found.length > 0) violations.push(`${relative(SRC_ROOT, file)}: ${found.length}`);
		}
		expect(violations).toEqual([]);
	}, SCAN_TIMEOUT_MS);

	it('has no "franja" jargon in visible copy', () => {
		const violations: string[] = [];
		for (const file of collectSourceFiles(SRC_ROOT)) {
			const found = findFranja(readFileSync(file, 'utf8'));
			if (found.length > 0) violations.push(`${relative(SRC_ROOT, file)}: ${[...new Set(found)].join(', ')}`);
		}
		expect(violations).toEqual([]);
	}, SCAN_TIMEOUT_MS);

	it('detects imperative and indicative voseo', () => {
		expect(findVoseo('Creá la evaluación. ¿Confirmás? Elegí uno; no tenés permiso; escribís.')).toEqual([
			'Creá',
			'Confirmás',
			'Elegí',
			'tenés',
			'escribís',
		]);
	});

	it('accepts tuteo and unrelated words that merely end in an accent', () => {
		expect(findVoseo('Crea la evaluación. Selecciona un curso. Está listo, será así; verás más después.')).toEqual([]);
	});
});
// #endregion
