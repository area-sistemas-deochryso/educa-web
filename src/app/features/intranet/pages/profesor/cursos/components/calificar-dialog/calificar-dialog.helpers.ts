import {
	CalificacionConNotasDto,
	esNotaEditable,
	GrupoContenidoDto,
	NotaRow,
	GrupoNotaRow,
	GrupoMiembroInfo,
} from '@features/intranet/pages/profesor/models';
import { isNotaAprobada } from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';

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
			};
		});

		const nonOverrideMember = miembros.find((m) => !m.esOverride && m.notaActual !== null);
		const grupoNota = nonOverrideMember?.notaActual ?? null;

		const firstNotaWithObs = cal.notas.find(
			(n) => n.grupoId === grupo.id && n.observacion,
		);

		return {
			grupoId: grupo.id,
			grupoNombre: grupo.nombre,
			nota: grupoNota,
			observacion: firstNotaWithObs?.observacion ?? '',
			miembros,
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

export function calcGrupoStats(
	rows: GrupoNotaRow[],
	config: ConfiguracionCalificacionListDto | null,
): GrupoStats {
	const conNota = rows.filter((r) => r.nota !== null && r.nota !== undefined);
	const promedio =
		conNota.length > 0
			? conNota.reduce((acc, r) => acc + (r.nota ?? 0), 0) / conNota.length
			: 0;
	const aprobados = conNota.filter((r) => isNotaAprobada(r.nota, config)).length;
	const totalOverrides = rows.reduce(
		(acc, r) => acc + r.miembros.filter((m) => m.esOverride).length,
		0,
	);
	return {
		total: rows.length,
		conNota: conNota.length,
		promedio,
		aprobados,
		desaprobados: conNota.length - aprobados,
		sinCalificar: rows.filter((r) => r.nota === null || r.nota === undefined).length,
		totalOverrides,
	};
}
