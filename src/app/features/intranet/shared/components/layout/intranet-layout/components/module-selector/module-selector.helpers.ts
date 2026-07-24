import { ModuloMenu } from '../../intranet-menu.config';
import { ModuloId } from '@shared/constants';

// #region Types
/** Flat search result — a single navigable page. */
export interface SearchResult {
	label: string;
	route: string;
	icon: string;
	moduloId: ModuloId;
	moduloLabel: string;
	groupLabel: string;
	/** Label del primer nivel de `subgroup` (ej. "Correos" en Monitoreo > Correos > Bandeja). */
	subgroupLabel?: string;
	queryParams?: Record<string, string>;
	keywords: string;
}

export interface TreeSubsection {
	label: string;
	items: SearchResult[];
}

export interface TreeSection {
	label: string;
	/** Items del grupo sin subgroup (ej. "Resumen", "Asistencia diaria") -- hojas directas. */
	items: SearchResult[];
	/** Items agrupados por el primer nivel de `subgroup` (ej. Correos/Incidencias/Seguridad). */
	subsections: TreeSubsection[];
}

/** Tree group — module or section header with its items. */
export interface TreeGroup {
	moduloId: ModuloId;
	moduloLabel: string;
	moduloIcon: string;
	itemCount: number;
	sections: TreeSection[];
}
// #endregion

// #region Build — flat index
function toResult(
	item: { route?: string; label: string; icon: string; queryParams?: Record<string, string> },
	modulo: ModuloMenu,
	groupLabel: string,
	subgroupLabel: string | undefined,
): SearchResult {
	const route = item.route!;
	// Include route as-is (for "intranet/admin") AND with separators as spaces (for "admin horarios").
	const routeExpanded = route.replace(/\//g, ' ').replace(/-/g, ' ');
	const keywords = [item.label, modulo.label, groupLabel, subgroupLabel ?? '', route, routeExpanded]
		.join(' ')
		.toLowerCase();

	return {
		label: item.label,
		route,
		icon: item.icon,
		moduloId: modulo.id,
		moduloLabel: modulo.label,
		groupLabel,
		subgroupLabel,
		queryParams: item.queryParams,
		keywords,
	};
}

/**
 * Recorre `children` a cualquier profundidad. `group` puede anidar más de un nivel via
 * `subgroup` (brief 458: "Admin" → "Asistencias" → Gestión/Reportes) — un recorrido de un
 * solo nivel de children perdía por completo cualquier item a 2+ niveles de anidamiento.
 * `groupLabel` se mantiene fijo al label del grupo de tope; `subgroupLabel` se fija una sola
 * vez, al primer nivel de anidamiento debajo del grupo (ej. "Correos" en Monitoreo), y niveles
 * más profundos (ej. Asistencia: Admin → Asistencias) se aplanan bajo ese mismo subgrupo.
 */
function collectLeaves(
	items: ModuloMenu['items'],
	modulo: ModuloMenu,
	groupLabel: string,
	subgroupLabel: string | undefined,
	results: SearchResult[],
): void {
	for (const item of items) {
		if (item.route) {
			results.push(toResult(item, modulo, groupLabel, subgroupLabel));
		}
		if (item.children) {
			collectLeaves(item.children, modulo, groupLabel, subgroupLabel ?? item.label, results);
		}
	}
}

/** Índice plano de todas las páginas navegables, con `groupLabel`/`subgroupLabel` resueltos. */
export function buildAllResults(modulos: ModuloMenu[]): SearchResult[] {
	const results: SearchResult[] = [];
	for (const modulo of modulos) {
		for (const item of modulo.items) {
			if (item.route) {
				results.push(toResult(item, modulo, '', undefined));
			}
			if (item.children) {
				collectLeaves(item.children, modulo, item.label, undefined, results);
			}
		}
	}
	return results;
}
// #endregion

// #region Build — mega menu tree
interface SectionEntry {
	items: SearchResult[];
	subsections: Map<string, SearchResult[]>;
}

/** Agrupa el índice plano en el árbol módulo → grupo → (items directos | subgrupo → items). */
export function buildMegaColumns(all: SearchResult[], modulos: ModuloMenu[]): TreeGroup[] {
	const moduloMap = new Map<ModuloId, { id: ModuloId; label: string; icon: string; sections: Map<string, SectionEntry> }>();

	for (const r of all) {
		let modEntry = moduloMap.get(r.moduloId);
		if (!modEntry) {
			const mod = modulos.find((m) => m.id === r.moduloId);
			modEntry = { id: r.moduloId, label: r.moduloLabel, icon: mod?.icon ?? 'pi pi-folder', sections: new Map() };
			moduloMap.set(r.moduloId, modEntry);
		}
		const sectionKey = r.groupLabel || '(General)';
		let section = modEntry.sections.get(sectionKey);
		if (!section) {
			section = { items: [], subsections: new Map() };
			modEntry.sections.set(sectionKey, section);
		}
		if (r.subgroupLabel) {
			const subItems = section.subsections.get(r.subgroupLabel) ?? [];
			subItems.push(r);
			section.subsections.set(r.subgroupLabel, subItems);
		} else {
			section.items.push(r);
		}
	}

	return Array.from(moduloMap.values()).map((entry) => {
		const sections = Array.from(entry.sections.entries()).map(([label, section]) => ({
			label,
			items: section.items,
			subsections: Array.from(section.subsections.entries()).map(([subLabel, items]) => ({ label: subLabel, items })),
		}));
		const itemCount = sections.reduce(
			(acc, s) => acc + s.items.length + s.subsections.reduce((subAcc, sub) => subAcc + sub.items.length, 0),
			0,
		);
		return { moduloId: entry.id, moduloLabel: entry.label, moduloIcon: entry.icon, itemCount, sections };
	});
}
// #endregion

// #region Search scoring
export function scoreResult(result: SearchResult, words: string[]): number {
	let total = 0;
	for (const word of words) {
		const labelMatch = result.label.toLowerCase().includes(word);
		const keywordsMatch = result.keywords.includes(word);

		if (!labelMatch && !keywordsMatch) return 0;
		total += labelMatch ? 2 : 1;
	}
	return total;
}
// #endregion
