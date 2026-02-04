// debug.filter.ts
// * Helper to compile include/exclude debug tag filters.
export function compileDebugFilter(pattern: string | undefined | null) {
	const raw = (pattern ?? '').trim();
	if (!raw) return () => true;

	const parts = raw
		.split(/[\s,]+/g)
		.map((p) => p.trim())
		.filter(Boolean);

	const includes: RegExp[] = [];
	const excludes: RegExp[] = [];

	for (const p of parts) {
		const isExclude = p.startsWith('-');
		const token = isExclude ? p.slice(1) : p;
		const re = wildcardToRegExp(token);
		(isExclude ? excludes : includes).push(re);
	}

	return (tag: string) => {
		const included = includes.length === 0 || includes.some((re) => re.test(tag));
		if (!included) return false;
		const excluded = excludes.some((re) => re.test(tag));
		return !excluded;
	};
}

function wildcardToRegExp(pat: string): RegExp {
	const esc = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&');
	const withWild = esc.replace(/\*/g, '.*');
	return new RegExp(`^${withWild}$`);
}

export function safeGetLocalStorage(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}
