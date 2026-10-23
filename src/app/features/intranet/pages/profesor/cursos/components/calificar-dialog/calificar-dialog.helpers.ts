import {
	CalificacionConNotasDto,
	CalificarGrupoDto,
	EntregaCalificacionDto,
	esNotaEditable,
	NOTA_MINIMA,
	NOTA_MAXIMA,
	GrupoContenidoDto,
	NotaRow,
	GrupoNotaRow,
	GrupoMiembroInfo,
} from '@features/intranet/pages/profesor/models';
import { isNotaAprobada } from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto, ConfiguracionLiteralDto } from '@data/models';

export interface IndividualStats {
	total: number;
	conNota: number;
	promedio: number;
	aprobados: number;
	desaprobados: number;
	sinCalificar: number;
}

export interface GrupoStats extends IndividualStats {
	totalOverrides: number;
	totalGrupos: number;
}

export interface GruposPayload {
	grupos: CalificarGrupoDto[];
	/** Grupos con excepciones pero con miembros sin nota: el BE exige una nota de grupo, así que no se pueden enviar. */
	incompletos: string[];
}

/** Con tarea enlazada hay una fila de entrega por alumno (INV-C18); sin tarea no hay estado de entrega que mostrar. */
function entregaDelAlumno(cal: CalificacionConNotasDto, estudianteId: number): EntregaCalificacionDto | null {
	if (cal.tareaId === null) return null;
	return cal.entregas?.find((e) => e.estudianteId === estudianteId) ?? null;
}

/** En evaluación grupal el estado, la fecha y los archivos son los del grupo: todas sus filas los comparten. */
function entregaDelGrupo(cal: CalificacionConNotasDto, grupoId: number): EntregaCalificacionDto | null {
	if (cal.tareaId === null) return null;
	return cal.entregas?.find((e) => e.grupoId === grupoId) ?? null;
}

export function buildNotaRows(
	cal: CalificacionConNotasDto,
	estudiantes: { id: number; nombre: string }[],
): NotaRow[] {
	return estudiantes.map((est) => {
		const existingNota = cal.notas.find((n) => n.estudianteId === est.id);
		return {
			estudianteId: est.id,
			estudianteNombre: est.nombre,
			nota: existingNota?.nota ?? null,
			observacion: existingNota?.observacion ?? '',
			existingNotaId: existingNota?.id ?? null,
			esEditable: existingNota ? esNotaEditable(existingNota.fechaCalificacion) : true,
			entrega: entregaDelAlumno(cal, est.id),
		};
	});
}

export function buildGrupoNotaRows(
	cal: CalificacionConNotasDto,
	grupos: GrupoContenidoDto[],
): GrupoNotaRow[] {
	return grupos.map((grupo) => {
		const miembros: GrupoMiembroInfo[] = grupo.estudiantes.map((est) => {
			const existingNota = cal.notas.find((n) => n.estudianteId === est.estudianteId);
			const isOverride = existingNota?.esOverride ?? false;
			return {
				estudianteId: est.estudianteId,
				nombre: est.estudianteNombre,
				notaActual: existingNota?.nota ?? null,
				esOverride: isOverride,
				overrideNota: isOverride ? (existingNota?.nota ?? null) : null,
				observacion: existingNota?.observacion ?? '',
			};
		});

		const nonOverrideMember = miembros.find((m) => !m.esOverride && m.notaActual !== null);
		const grupoNota = nonOverrideMember?.notaActual ?? null;

		// La observación del grupo es la de las notas que siguen al grupo; la de una excepción es del alumno.
		const firstNotaWithObs = cal.notas.find(
			(n) => n.grupoId === grupo.id && !n.esOverride && n.observacion,
		);

		return {
			grupoId: grupo.id,
			grupoNombre: grupo.nombre,
			nota: grupoNota,
			observacion: firstNotaWithObs?.observacion ?? '',
			miembros,
			entrega: entregaDelGrupo(cal, grupo.id),
		};
	});
}

export function calcIndividualStats(
	rows: NotaRow[],
	config: ConfiguracionCalificacionListDto | null,
): IndividualStats {
	const conNota = rows.filter((r) => r.nota !== null && r.nota !== undefined);
	const promedio =
		conNota.length > 0
			? conNota.reduce((acc, r) => acc + (r.nota ?? 0), 0) / conNota.length
			: 0;
	const aprobados = conNota.filter((r) => isNotaAprobada(r.nota, config)).length;
	return {
		total: rows.length,
		conNota: conNota.length,
		promedio,
		aprobados,
		desaprobados: conNota.length - aprobados,
		sinCalificar: rows.filter((r) => r.nota === null || r.nota === undefined).length,
	};
}

/** Nota que recibirá el miembro al guardar: su excepción si la tiene, si no la del grupo. */
export function notaEfectivaMiembro(row: GrupoNotaRow, miembro: GrupoMiembroInfo): number | null {
	return miembro.esOverride && miembro.overrideNota !== null ? miembro.overrideNota : row.nota;
}

/** Notas guardadas de alumnos que ningún grupo lista: el diálogo no las edita pero el panel sí las cuenta. */
export function notasFueraDeGrupo(cal: CalificacionConNotasDto, rows: GrupoNotaRow[]): number[] {
	const enGrupo = new Set(rows.flatMap((r) => r.miembros.map((m) => m.estudianteId)));
	return cal.notas.filter((n) => !enGrupo.has(n.estudianteId)).map((n) => n.nota);
}

/** Cuenta alumnos (no grupos), igual que el panel de evaluaciones. */
export function calcGrupoStats(
	rows: GrupoNotaRow[],
	config: ConfiguracionCalificacionListDto | null,
	fueraDeGrupo: number[] = [],
): GrupoStats {
	const efectivas = rows.flatMap((r) => r.miembros.map((m) => notaEfectivaMiembro(r, m)));
	const conNota = [...efectivas.filter((n): n is number => n !== null), ...fueraDeGrupo];
	const promedio =
		conNota.length > 0 ? conNota.reduce((acc, n) => acc + n, 0) / conNota.length : 0;
	const aprobados = conNota.filter((n) => isNotaAprobada(n, config)).length;
	const totalOverrides = rows.reduce(
		(acc, r) => acc + r.miembros.filter((m) => m.esOverride).length,
		0,
	);
	return {
		total: efectivas.length + fueraDeGrupo.length,
		conNota: conNota.length,
		promedio,
		aprobados,
		desaprobados: conNota.length - aprobados,
		sinCalificar: efectivas.length - (conNota.length - fueraDeGrupo.length),
		totalOverrides,
		totalGrupos: rows.length,
	};
}

/**
 * Arma lo que se envía al BE sin perder nada: las excepciones llevan la observación del alumno
 * (el BE sobrescribe `CN_Observacion` con lo recibido) y un grupo sin nota propia se envía si todos
 * sus miembros tienen excepción (la nota de grupo no se usa).
 */
export function buildGruposPayload(rows: GrupoNotaRow[]): GruposPayload {
	const grupos: CalificarGrupoDto[] = [];
	const incompletos: string[] = [];

	for (const r of rows) {
		const overrides = r.miembros
			.filter((m): m is GrupoMiembroInfo & { overrideNota: number } => m.esOverride && m.overrideNota !== null)
			.map((m) => ({ estudianteId: m.estudianteId, nota: m.overrideNota, observacion: m.observacion || null }));

		const notaGrupo = r.nota ?? (overrides.length === r.miembros.length ? (overrides[0]?.nota ?? null) : null);
		if (notaGrupo === null) {
			if (overrides.length > 0) incompletos.push(r.grupoNombre);
			continue;
		}
		grupos.push({
			grupoId: r.grupoId,
			nota: notaGrupo,
			observacion: r.observacion || null,
			...(overrides.length > 0 ? { overrides } : {}),
		});
	}
	return { grupos, incompletos };
}

export function clampNota(nota: number): number {
	const rounded = Math.round(nota * 10) / 10;
	return Math.min(Math.max(rounded, NOTA_MINIMA), NOTA_MAXIMA);
}

export function literalMidpoint(literal: ConfiguracionLiteralDto | null): number | null {
	if (!literal || literal.notaMinima == null || literal.notaMaxima == null) return null;
	return Math.round(((literal.notaMinima + literal.notaMaxima) / 2) * 10) / 10;
}

export function sanitizeObservacion(observacion: string): string {
	return observacion
		.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9\s.,;:\-()]/g, '')
		.slice(0, 100);
}
