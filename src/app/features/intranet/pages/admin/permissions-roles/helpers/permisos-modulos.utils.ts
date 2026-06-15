import type { CapabilityCatalogItem } from '@core/services';
import { capitalize, groupBy, sortedEntries } from '@core/helpers';

export interface ModuloCapabilities {
	nombre: string;
	capabilities: CapabilityCatalogItem[];
	seleccionadas: number;
	total: number;
}

export function buildModuloCapabilities(
	catalog: CapabilityCatalogItem[],
	selectedIds: number[],
): ModuloCapabilities[] {
	const grouped = groupBy(catalog, (c) => capitalize(c.modulo));

	return sortedEntries(grouped).map(([nombre, caps]) => ({
		nombre,
		capabilities: caps.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
		seleccionadas: caps.filter((c) => selectedIds.includes(c.id)).length,
		total: caps.length,
	}));
}

export function buildModuloCapabilitiesForDetail(
	capabilityIds: number[],
	catalog: CapabilityCatalogItem[],
): ModuloCapabilities[] {
	const resolved = capabilityIds
		.map((id) => catalog.find((c) => c.id === id))
		.filter((c): c is CapabilityCatalogItem => c !== undefined);

	const grouped = groupBy(resolved, (c) => capitalize(c.modulo));

	return sortedEntries(grouped).map(([nombre, caps]) => ({
		nombre,
		capabilities: caps.sort((a, b) => a.orden - b.orden),
		seleccionadas: caps.length,
		total: caps.length,
	}));
}
