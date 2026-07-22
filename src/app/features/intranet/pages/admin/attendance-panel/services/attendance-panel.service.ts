import { inject, Injectable } from '@angular/core';
import { forkJoin, map, shareReplay, type Observable } from 'rxjs';

import { formatDateLocalIso } from '@core/helpers';
import type { AsistenciaAdminEstadisticas } from '@data/models';
import { AttendancesAdminService } from '../../attendances/services';
import { AttendanceReportsApiService } from '@features/intranet/pages/cross-role/attendance-reports/services';
import type {
	ReporteFilters,
	TendenciaAsistencia,
	TendenciaRangoTipo,
} from '@features/intranet/pages/cross-role/attendance-reports/models';
import {
	PANEL_TIPOS_PERSONA,
	PANEL_TIPO_PERSONA_LABELS,
	type AttendancePanelBreakdownItem,
	type AttendancePanelFilters,
	type AttendancePanelHoraBucket,
	type AttendancePanelKpis,
	type AttendancePanelSerie,
} from '../models';

/**
 * Servicio de composición del panel de asistencias. Combina `asistencia-admin/estadisticas`
 * (KPIs + breakdown en modo Día), `asistencia-admin/dia` (chart Día) y `ReportesAsistencia/tendencia`
 * (KPIs + breakdown + chart en modo Semana/Mes) para armar los datos del panel.
 */
@Injectable({ providedIn: 'root' })
export class AttendancePanelService {
	private readonly reportsApi = inject(AttendanceReportsApiService);
	private readonly adminApi = inject(AttendancesAdminService);

	// #region KPIs (periodo actual vs periodo anterior equivalente)
	// Modo "Día" usa `asistencia-admin/estadisticas` (tipoPersona='todos') — evita el 400
	// REPORTE_SALON_REQUERIDO que `ReportesAsistencia/datos` exige para E/todos sin salón
	// seleccionado (Chat 469/474).
	// Modo Semana/Mes: `ReportesAsistencia/datos` exige el mismo salón para estos rangos
	// (mismo bug, Chat 2026-07-21) — en vez de repetir el parche puntual, se deriva de
	// `ReportesAsistencia/tendencia`, que ya se pedía para el gráfico y no exige salón.
	// Gap real: `tendencia` solo trae porcentajes por punto/tipo, no conteos crudos ni el
	// denominador — no hay forma correcta de derivar `ausencias`/`tardanzas` (ver
	// `conteosDisponibles` en el modelo). Esos 2 KPIs se marcan no disponibles en este rango.
	getKpis(filters: AttendancePanelFilters): Observable<AttendancePanelKpis> {
		if (filters.rango === 'dia') {
			return forkJoin({
				actual: this.getEstadisticasDia(filters, filters.fecha, 'todos'),
				previo: this.getEstadisticasDia(filters, this.fechaPeriodoAnterior(filters), 'todos'),
			}).pipe(
				map(({ actual, previo }) => ({
					porcentajeAsistencia: actual.porcentajeAsistencia,
					ausencias: actual.falta,
					tardanzas: actual.tardanza,
					porcentajeAsistenciaPrevio: previo.porcentajeAsistencia,
					ausenciasPrevio: previo.falta,
					tardanzasPrevio: previo.tardanza,
					conteosDisponibles: true,
					comparacionDisponible: true,
				})),
			);
		}

		return this.getTendenciaActualYPrevio(filters).pipe(
			map(({ actual, previo }) => ({
				porcentajeAsistencia: this.porcentajeAsistenciaTendencia(actual),
				ausencias: 0,
				tardanzas: 0,
				porcentajeAsistenciaPrevio: previo ? this.porcentajeAsistenciaTendencia(previo) : 0,
				ausenciasPrevio: 0,
				tardanzasPrevio: 0,
				conteosDisponibles: false,
				comparacionDisponible: previo !== null,
			})),
		);
	}
	// #endregion

	// #region Breakdown por tipo de persona (% asistencia del rango actual)
	// Modo "Día": migrado completo (E/P/A/C/M) al mismo endpoint que KPIs — un solo código
	// de acceso a datos por modo, en vez de mezclar dos fuentes para el mismo rango.
	// Modo Semana/Mes: promedio del `%` de cada tipo a través de los puntos de `tendencia`
	// (mismo dato que ya alimenta `getSeries`, agregado a un número por tipo).
	getBreakdown(filters: AttendancePanelFilters): Observable<AttendancePanelBreakdownItem[]> {
		if (filters.rango === 'dia') {
			const calls = PANEL_TIPOS_PERSONA.map((tipo) =>
				this.getEstadisticasDia(filters, filters.fecha, tipo).pipe(
					map((stats): AttendancePanelBreakdownItem => ({
						tipoPersona: tipo,
						label: PANEL_TIPO_PERSONA_LABELS[tipo],
						porcentajeAsistencia: stats.porcentajeAsistencia,
					})),
				),
			);
			return forkJoin(calls);
		}

		return this.getTendenciaActual(filters).pipe(
			map((tendencia) =>
				PANEL_TIPOS_PERSONA.map(
					(tipo): AttendancePanelBreakdownItem => ({
						tipoPersona: tipo,
						label: PANEL_TIPO_PERSONA_LABELS[tipo],
						porcentajeAsistencia: this.promedioPorcentajePorTipo(tendencia, tipo),
					}),
				),
			),
		);
	}
	// #endregion

	// #region Chart Día — llegadas por hora (on-time vs tarde), clasificación server-side
	// `estadoCodigo` ya viene clasificado por el BE (regla real de tardanza por rol, incluida
	// la ventana de horario de verano) — no se reclasifica en el FE con un corte fijo.
	// 'T' = tarde, 'A' = a tiempo. Faltas ('F') y justificados ('J') no tienen hora de
	// llegada relevante para este split y se ignoran.
	getHoraBuckets(filters: AttendancePanelFilters): Observable<AttendancePanelHoraBucket[]> {
		const fecha = formatDateLocalIso(filters.fecha);
		return this.adminApi
			.listarDelDia(fecha, filters.sedeId ?? undefined)
			.pipe(
				map((registros) => {
					const buckets = new Map<number, AttendancePanelHoraBucket>();
					for (let h = 0; h < 24; h++) buckets.set(h, { hora: h, aTiempo: 0, tarde: 0 });

					for (const r of registros) {
						if (!r.horaEntrada) continue;
						if (r.estadoCodigo !== 'T' && r.estadoCodigo !== 'A') continue;
						const d = new Date(r.horaEntrada);
						if (Number.isNaN(d.getTime())) continue;
						const bucket = buckets.get(d.getHours());
						if (!bucket) continue;
						if (r.estadoCodigo === 'T') bucket.tarde += 1;
						else bucket.aTiempo += 1;
					}

					return [...buckets.values()];
				}),
			);
	}
	// #endregion

	// #region Chart Semana/Mes — línea por tipo de persona
	// Semana: ~5 puntos (Lun-Vie). Mes: 4-5 puntos (uno por semana calendario).
	// Serie temporal servida directamente por `ReportesAsistencia/tendencia` — comparte el
	// mismo request (cacheado, ver `getTendenciaActual`) que ya usan `getKpis`/`getBreakdown`
	// para este rango, en vez de triplicar la llamada.
	getSeries(filters: AttendancePanelFilters): Observable<AttendancePanelSerie[]> {
		const rango: TendenciaRangoTipo = filters.rango === 'semana' ? 'semana' : 'mes';

		return this.getTendenciaActual(filters).pipe(
			map((tendencia) =>
				PANEL_TIPOS_PERSONA.map(
					(tipo): AttendancePanelSerie => ({
						tipoPersona: tipo,
						label: PANEL_TIPO_PERSONA_LABELS[tipo],
						puntos: tendencia.puntos.map((punto, i) => ({
							etiqueta: this.etiquetaPunto(rango, punto.fecha, i),
							porcentaje: tipo === 'todos' ? 0 : (punto.porcentajesPorTipo[tipo] ?? 0),
						})),
					}),
				),
			),
		);
	}
	// #endregion

	// #region Cache de `tendencia` — evita triplicar el request entre getKpis/getBreakdown/getSeries
	// `loadData` del facade dispara los 3 en paralelo (mismo `forkJoin`) para el mismo rango/fecha/sede;
	// se cachea el observable HTTP (shareReplay) por esa combinación de parámetros, no la respuesta
	// entre distintas cargas — cada `loadData` con filtros nuevos genera una entrada nueva.
	private tendenciaCache = new Map<string, Observable<TendenciaAsistencia>>();

	private getTendenciaActual(filters: AttendancePanelFilters): Observable<TendenciaAsistencia> {
		const rango: TendenciaRangoTipo = filters.rango === 'semana' ? 'semana' : 'mes';
		return this.getTendenciaCacheada(rango, filters.fecha, filters.sedeId);
	}

	private getTendenciaActualYPrevio(
		filters: AttendancePanelFilters,
	): Observable<{ actual: TendenciaAsistencia; previo: TendenciaAsistencia | null }> {
		const rango: TendenciaRangoTipo = filters.rango === 'semana' ? 'semana' : 'mes';
		return forkJoin({
			actual: this.getTendenciaCacheada(rango, filters.fecha, filters.sedeId),
			previo: this.getTendenciaCacheada(rango, this.fechaPeriodoAnterior(filters), filters.sedeId),
		});
	}

	private getTendenciaCacheada(
		rango: TendenciaRangoTipo,
		fecha: Date,
		sedeId: number | null,
	): Observable<TendenciaAsistencia> {
		const key = `${rango}|${formatDateLocalIso(fecha)}|${sedeId ?? 'null'}`;
		const cached = this.tendenciaCache.get(key);
		if (cached) return cached;

		// Cache acotada: el singleton (`providedIn: 'root'`) vive toda la sesión — sin este tope
		// acumularía una entrada por cada combinación de fecha/sede/rango navegada.
		if (this.tendenciaCache.size >= 20) this.tendenciaCache.clear();

		const request$ = this.reportsApi
			.getTendencia(rango, fecha, sedeId)
			.pipe(shareReplay({ bufferSize: 1, refCount: false }));
		this.tendenciaCache.set(key, request$);
		return request$;
	}
	// #endregion

	// #region Helpers
	// 'todos' se envía como ausencia de tipoPersona — el BE interpreta null/undefined como
	// "sin filtro" (E+P+A+C+M); el literal 'todos' no es un TipoPersonaAsistencia real y
	// rompería el filtro `ASP_TipoPersona == tipoPersona` de los campos legacy del DTO.
	private getEstadisticasDia(
		filters: AttendancePanelFilters,
		fecha: Date,
		tipoPersona: ReporteFilters['tipoPersona'],
	): Observable<AsistenciaAdminEstadisticas> {
		const tipo = tipoPersona === 'todos' ? undefined : tipoPersona;
		return this.adminApi
			.obtenerEstadisticas(formatDateLocalIso(fecha), filters.sedeId ?? undefined, tipo)
			.pipe(map((dto) => dto ?? this.emptyEstadisticas(fecha)));
	}

	private emptyEstadisticas(fecha: Date): AsistenciaAdminEstadisticas {
		return {
			fecha: formatDateLocalIso(fecha),
			totalRegistros: 0,
			completas: 0,
			incompletas: 0,
			registrosManuales: 0,
			registrosWebhook: 0,
			totalEstudiantes: 0,
			totalProfesores: 0,
			totalAsistentesAdmin: 0,
			completasEstudiantes: 0,
			completasProfesores: 0,
			completasAsistentesAdmin: 0,
			asistio: 0,
			falta: 0,
			tardanza: 0,
			total: 0,
			porcentajeAsistencia: 0,
		};
	}

	/** Promedio simple de `porcentajesPorTipo[tipo]` a través de todos los puntos de la serie. */
	private promedioPorcentajePorTipo(
		tendencia: TendenciaAsistencia,
		tipo: (typeof PANEL_TIPOS_PERSONA)[number],
	): number {
		if (tipo === 'todos' || tendencia.puntos.length === 0) return 0;
		const suma = tendencia.puntos.reduce((acc, p) => acc + (p.porcentajesPorTipo[tipo] ?? 0), 0);
		return Math.round(suma / tendencia.puntos.length);
	}

	/** % Asistencia "global" del rango: promedio de todos los tipos a través de todos los puntos. */
	private porcentajeAsistenciaTendencia(tendencia: TendenciaAsistencia): number {
		const tipos = PANEL_TIPOS_PERSONA.filter((t) => t !== 'todos');
		if (tipos.length === 0) return 0;
		const suma = tipos.reduce((acc, tipo) => acc + this.promedioPorcentajePorTipo(tendencia, tipo), 0);
		return Math.round(suma / tipos.length);
	}

	private fechaPeriodoAnterior(filters: AttendancePanelFilters): Date {
		const d = new Date(filters.fecha);
		if (filters.rango === 'dia') d.setDate(d.getDate() - 1);
		else if (filters.rango === 'semana') d.setDate(d.getDate() - 7);
		else d.setMonth(d.getMonth() - 1);
		return d;
	}

	/** Etiqueta de un punto de la serie: día corto (Semana) o número de semana (Mes). */
	private etiquetaPunto(rango: TendenciaRangoTipo, fechaIso: string, index: number): string {
		if (rango === 'mes') return `Sem ${index + 1}`;
		const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
		const d = new Date(fechaIso);
		return Number.isNaN(d.getTime()) ? `Día ${index + 1}` : dias[d.getDay()];
	}
	// #endregion
}
