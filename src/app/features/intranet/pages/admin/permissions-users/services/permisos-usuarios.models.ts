import { CapabilityCatalogItem } from '@core/services';

export interface ModuloCapabilities {
	nombre: string;
	capabilities: CapabilityCatalogItem[];
	total: number;
}
