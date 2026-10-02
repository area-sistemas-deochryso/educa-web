// #region Imports
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

// #endregion
// #region Helpers
const SRC_ROOT = resolve(__dirname, '..', '..');
const ALLOWED_CHILDREN = new Set(['edu-tab', 'edu-tabpanel']);
const VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);
const TAG_REGEX = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>/g;

function collectHtmlFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) return collectHtmlFiles(full);
		return full.endsWith('.html') ? [full] : [];
	});
}

/** Direct child tags of every `<edu-tabs>` in the template that edu-tabs cannot project. */
function findUnprojectableChildren(html: string): string[] {
	const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
	const stack: string[] = [];
	const offenders: string[] = [];
	for (const match of withoutComments.matchAll(TAG_REGEX)) {
		const [, closing, name, , selfClosing] = match;
		if (closing) {
			stack.pop();
			continue;
		}
		if (stack[stack.length - 1] === 'edu-tabs' && !ALLOWED_CHILDREN.has(name)) {
			offenders.push(name);
		}
		if (!selfClosing && !VOID_TAGS.has(name)) stack.push(name);
	}
	return offenders;
}

// #endregion
// #region Tests
describe('edu-tabs templates', () => {
	// edu-tabs projects only `edu-tab` / `edu-tabpanel` via <ng-content select>; any other
	// direct child (e.g. a wrapper <div>) is silently dropped from the DOM.
	it('only declare edu-tab / edu-tabpanel as direct children of <edu-tabs>', () => {
		const violations: string[] = [];
		for (const file of collectHtmlFiles(SRC_ROOT)) {
			const html = readFileSync(file, 'utf8');
			if (!html.includes('<edu-tabs')) continue;
			const offenders = findUnprojectableChildren(html);
			if (offenders.length > 0) {
				violations.push(`${relative(SRC_ROOT, file)}: <${[...new Set(offenders)].join('>, <')}>`);
			}
		}
		expect(violations).toEqual([]);
	});

	it('detects a wrapper element between edu-tabs and edu-tab', () => {
		const html = '<edu-tabs><div class="row"><edu-tab value="0">A</edu-tab></div></edu-tabs>';
		expect(findUnprojectableChildren(html)).toEqual(['div']);
	});

	it('accepts direct edu-tab / edu-tabpanel children with control flow around them', () => {
		const html = `<edu-tabs>@for (t of tabs; track t) {<edu-tab [value]="t">{{ t }}</edu-tab>}<edu-tabpanel value="0"><div></div></edu-tabpanel></edu-tabs>`;
		expect(findUnprojectableChildren(html)).toEqual([]);
	});
});
// #endregion
