// #region Imports
import { SalonListDto } from '@features/intranet/pages/admin/schedules/models/salon.interface';
import { detectarNivel, NIVEL_VISUAL_CONFIGS, type NivelEducativo, type NivelVisualConfig } from '@core/helpers';
import { esSeccionDeVerano } from '@shared/models';
import { type ModoAsignacion, resolveModoAsignacion } from '@data/adapters';
import { SalonAsignacion } from '../../services';

// #endregion
// #region Implementation

export function formatSeccionLabel(seccion: string): string {
	return esSeccionDeVerano(seccion) ? 'Verano' : seccion;
}

export function computeGradosOptions(salones: SalonListDto[]): { label: string; value: string }[] {
	const gradosUnicos = new Set<string>();
	const result: { label: string; value: string }[] = [];

	salones.forEach((s) => {
		if (!gradosUnicos.has(s.grado)) {
			gradosUnicos.add(s.grado);
			result.push({ label: s.grado, value: s.grado });
		}
	});

	return result;
}

export function computeSeccionesOptions(
	salones: SalonListDto[],
	grado: string | null,
): { label: string; value: string }[] {
	if (!grado) return [];

	return salones
		.filter((s) => s.grado === grado)
		.map((s) => ({
			label: formatSeccionLabel(s.seccion),
			value: s.seccion,
		}));
}

export function findSalonSeleccionado(
	salones: SalonListDto[],
	grado: string | null,
	seccion: string | null,
): SalonListDto | null {
	if (!grado || !seccion) return null;

	return salones.find((s) => s.grado === grado && s.seccion === seccion) || null;
}

export interface SalonAsignadoView {
	salonId: number;
	salonNombre: string;
	esTutor: boolean;
	modo: ModoAsignacion;
}

export function computeSalonesAsignados(
	asignaciones: SalonAsignacion[],
	salones: SalonListDto[],
): SalonAsignadoView[] {
	return asignaciones.map((a) => {
		const salon = salones.find((s) => s.salonId === a.salonId);
		const modo: ModoAsignacion = salon ? resolveModoAsignacion(salon.gradoOrden, salon.seccion) : 'Flexible';
		return {
			salonId: a.salonId,
			salonNombre: salon ? `${salon.grado} - ${formatSeccionLabel(salon.seccion)}` : `Salón #${a.salonId}`,
			esTutor: a.esTutor,
			modo,
		};
	});
}

export type SalonCeldaState = 'active' | 'missing' | 'na';

export interface SalonCeldaView {
	seccion: string;
	/** null cuando el grado no tiene salón en esa sección. */
	salonId: number | null;
	state: SalonCeldaState;
	modo: ModoAsignacion | null;
	titulo: string;
}

export interface SalonFilaView {
	gradoId: number;
	grado: string;
	celdas: SalonCeldaView[];
}

export interface SalonNivelView extends NivelVisualConfig {
	filas: SalonFilaView[];
	/** Salones asignados en el nivel. */
	total: number;
	/** Salones existentes en el nivel. */
	max: number;
	/** Resumen corto de lo asignado, p. ej. ['1A', '2A', '3V']. */
	resumen: string[];
}

export interface SalonesMatrizView {
	columnas: { seccion: string; label: string }[];
	niveles: SalonNivelView[];
}

const NIVEL_ORDER: NivelEducativo[] = ['Inicial', 'Primaria', 'Secundaria'];

const MODO_LABEL: Record<ModoAsignacion, string> = {
	TutorPleno: 'Tutor pleno',
	PorCurso: 'Por curso',
	Flexible: 'Flexible',
};

/** Orden de secciones: A, B, C… y la de verano ('V') siempre al final. */
function compareSecciones(a: string, b: string): number {
	const va = esSeccionDeVerano(a);
	const vb = esSeccionDeVerano(b);
	if (va !== vb) return va ? 1 : -1;
	return a.localeCompare(b);
}

/** Matriz grado × sección agrupada por nivel; cada celda indica si el salón está asignado. */
export function computeSalonesMatriz(salones: SalonListDto[], asignaciones: SalonAsignacion[]): SalonesMatrizView {
	const asignados = new Set(asignaciones.map((a) => a.salonId));
	const secciones = [...new Set(salones.map((s) => s.seccion))].sort(compareSecciones);
	const columnas = secciones.map((seccion) => ({ seccion, label: formatSeccionLabel(seccion) }));

	const grados = new Map<number, { grado: string; orden: number }>();
	for (const s of salones) {
		if (!grados.has(s.gradoId)) grados.set(s.gradoId, { grado: s.grado, orden: s.gradoOrden });
	}

	const niveles = NIVEL_ORDER.flatMap((nivel): SalonNivelView[] => {
		const filas = [...grados.entries()]
			.filter(([, g]) => detectarNivel(g.grado) === nivel)
			.sort(([, a], [, b]) => a.orden - b.orden)
			.map(([gradoId, g]): SalonFilaView => {
				const celdas = secciones.map((seccion): SalonCeldaView => {
					const salon = salones.find((s) => s.gradoId === gradoId && s.seccion === seccion);
					if (!salon) return { seccion, salonId: null, state: 'na', modo: null, titulo: '' };
					const modo = resolveModoAsignacion(salon.gradoOrden, salon.seccion);
					return {
						seccion,
						salonId: salon.salonId,
						state: asignados.has(salon.salonId) ? 'active' : 'missing',
						modo,
						titulo: `${g.grado} - ${formatSeccionLabel(seccion)} · ${MODO_LABEL[modo]}`,
					};
				});
				return { gradoId, grado: g.grado, celdas };
			});
		if (filas.length === 0) return [];
		const celdas = filas.flatMap((f) => f.celdas.filter((c) => c.salonId !== null));
		const resumen = filas.flatMap((f) =>
			f.celdas
				.filter((c) => c.state === 'active')
				.map((c) => `${/\d/.exec(f.grado)?.[0] ?? ''}${formatSeccionLabel(c.seccion).charAt(0)}`),
		);
		return [
			{
				...NIVEL_VISUAL_CONFIGS[nivel],
				filas,
				total: celdas.filter((c) => c.state === 'active').length,
				max: celdas.length,
				resumen,
			},
		];
	});

	return { columnas, niveles };
}

// #endregion
