import type { ConfiguracionCalificacionListDto } from '@data/models';
import { convertToLiteral } from '@intranet-shared/services/calificacion-config';

export const RENDIMIENTO_NOTA_MAXIMA = 20;

/** Banda del eje Y: tramo de notas que cae en una letra de la escala literal (INV-C13). */
export interface BandaEscala {
	letra: string;
	descripcion: string;
	/** Límite inferior del tramo. */
	desde: number;
	/** Límite superior del tramo (donde empieza la letra siguiente). */
	hasta: number;
	centro: number;
	severity: 'success' | 'warn' | 'danger';
}

/** Bandas de la escala literal, de la letra más baja a la más alta. Vacío si la escala es numérica o no hay config. */
export function buildBandas(config: ConfiguracionCalificacionListDto | null): BandaEscala[] {
	if (config?.tipoCalificacion !== 'LITERAL') return [];

	// Cada tramo empieza donde `findLiteral` cambia de letra: `notaMinima - 0.5` (redondeo mitad hacia arriba).
	// Así las bandas no se solapan aunque el rango declare decimales (p. ej. 17.99) y no quedan huecos.
	const literales = config.literales
		.filter((l) => l.notaMinima !== null)
		.sort((a, b) => (a.notaMinima as number) - (b.notaMinima as number));

	return literales.map((l, i) => {
		const desde = i === 0 ? 0 : Math.max(0, (l.notaMinima as number) - 0.5);
		const siguiente = literales[i + 1];
		const hasta = siguiente ? Math.max(0, (siguiente.notaMinima as number) - 0.5) : RENDIMIENTO_NOTA_MAXIMA;
		const severity: BandaEscala['severity'] = !l.esAprobatoria ? 'danger' : l.orden <= 1 ? 'success' : 'warn';
		return { letra: l.letra, descripcion: l.descripcion, desde, hasta, centro: (desde + hasta) / 2, severity };
	});
}

/** Letra de un promedio según la escala del curso (INV-C13), o `null` si la escala es numérica o no hay letra. */
export function letraDePromedio(
	promedio: number | null,
	config: ConfiguracionCalificacionListDto | null,
): string | null {
	return convertToLiteral(promedio, config)?.letra ?? null;
}
