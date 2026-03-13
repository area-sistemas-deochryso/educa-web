import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@core/helpers';
import { IndexedDBService } from '@core/services/storage/indexed-db.service';
import { StorageService } from '@core/services/storage';
import { TimerManager } from '@core/services/destroy';
import {
	SmartNotification,
	HorarioSnapshot,
	ActividadSnapshot,
	CalificacionSnapshot,
} from './smart-notification.models';
import { NotificationPriority } from './notifications.config';

// Check every 5 minutes for schedule-based notifications
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class SmartNotificationService {
	// #region Dependencias
	private readonly idb = inject(IndexedDBService);
	private readonly storage = inject(StorageService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly timerManager = new TimerManager();
	// #endregion

	// #region Estado privado
	private readonly _horarios = signal<HorarioSnapshot[]>([]);
	private readonly _actividades = signal<ActividadSnapshot[]>([]);
	private readonly _calificaciones = signal<CalificacionSnapshot[]>([]);
	private readonly _previousCalificaciones = signal<CalificacionSnapshot[]>([]);
	private readonly _initialized = signal(false);
	// #endregion

	// #region Computed - Notificaciones generadas
	readonly smartNotifications = computed<SmartNotification[]>(() => {
		const notifications: SmartNotification[] = [];
		const now = new Date();

		this.generateHorarioNotifications(now, notifications);
		this.generateActividadNotifications(now, notifications);
		this.generateCalificacionNotifications(notifications);

		return notifications;
	});
	// #endregion

	// #region Inicialización
	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.init();
		}
	}

	private async init(): Promise<void> {
		await this.loadFromIndexedDB();
		await this.cleanup();
		this._initialized.set(true);

		// Periodic re-evaluation (triggers computed recalculation via signal update)
		this.timerManager.setInterval(() => {
			this._horarios.update((h) => [...h]);
		}, CHECK_INTERVAL_MS);
	}
	// #endregion

	// #region Snapshot commands

	/**
	 * Save schedule snapshot. Called from horarios facades.
	 */
	async saveHorarioSnapshot(horarios: { cursoNombre: string; diaSemana: number; horaInicio: string; horaFin: string; salonDescripcion: string }[]): Promise<void> {
		const entityId = this.getEntityId();
		if (!entityId) return;

		const snapshots: HorarioSnapshot[] = horarios.map((h) => ({
			cursoNombre: h.cursoNombre,
			diaSemana: h.diaSemana,
			horaInicio: h.horaInicio,
			horaFin: h.horaFin,
			salonDescripcion: h.salonDescripcion,
		}));

		this._horarios.set(snapshots);

		await this.idb.setSmartData({
			key: `${entityId}:horarios`,
			entityId,
			type: 'horarios',
			data: snapshots,
			savedAt: Date.now(),
			weekStart: this.getWeekStart(),
		});
	}

	/**
	 * Save activities snapshot (tareas, evaluaciones, exposiciones).
	 * Called from cursos/notas facades when course content loads.
	 */
	async saveActividadSnapshot(actividades: ActividadSnapshot[]): Promise<void> {
		const entityId = this.getEntityId();
		if (!entityId) return;

		// Merge with existing activities (different courses may load at different times)
		const existing = this._actividades();
		const merged = this.mergeActividades(existing, actividades);

		this._actividades.set(merged);

		await this.idb.setSmartData({
			key: `${entityId}:actividades`,
			entityId,
			type: 'actividades',
			data: merged,
			savedAt: Date.now(),
			weekStart: this.getWeekStart(),
		});
	}

	/**
	 * Save grade snapshot for change detection.
	 * Called from notas facades.
	 */
	async saveCalificacionSnapshot(calificaciones: CalificacionSnapshot[]): Promise<void> {
		const entityId = this.getEntityId();
		if (!entityId) return;

		// Keep current as previous for comparison
		const current = this._calificaciones();
		if (current.length > 0) {
			this._previousCalificaciones.set(current);
		}

		this._calificaciones.set(calificaciones);

		await this.idb.setSmartData({
			key: `${entityId}:calificaciones`,
			entityId,
			type: 'calificaciones',
			data: calificaciones,
			savedAt: Date.now(),
			weekStart: this.getWeekStart(),
		});
	}
	// #endregion

	// #region Notification generators

	private generateHorarioNotifications(now: Date, out: SmartNotification[]): void {
		const horarios = this._horarios();
		if (horarios.length === 0) return;

		// 1=Lun..5=Vie (our format). JS: 0=Dom,1=Lun..6=Sab
		const jsDow = now.getDay();
		const todayDow = jsDow === 0 ? 7 : jsDow;
		const todayHorarios = horarios.filter((h) => h.diaSemana === todayDow);

		const nowMinutes = now.getHours() * 60 + now.getMinutes();

		for (const h of todayHorarios) {
			const [hh, mm] = h.horaInicio.split(':').map(Number);
			const startMinutes = hh * 60 + mm;
			const diff = startMinutes - nowMinutes;

			if (diff <= 0 || diff > 60) continue;

			let priority: NotificationPriority;
			let message: string;

			if (diff <= 10) {
				priority = 'urgent';
				message = `Tu clase de ${h.cursoNombre} empieza en ${diff} min - ${h.salonDescripcion}`;
			} else if (diff <= 30) {
				priority = 'urgent';
				message = `Clase de ${h.cursoNombre} en ${diff} min - ${h.salonDescripcion}`;
			} else {
				priority = 'high';
				message = `Clase de ${h.cursoNombre} en ${diff} min - ${h.salonDescripcion}`;
			}

			out.push({
				id: `smart-horario-${h.diaSemana}-${h.horaInicio}`,
				type: 'smart',
				title: 'Clase próxima',
				message,
				icon: 'pi-clock',
				priority,
				actionUrl: '/intranet/horarios',
				dismissible: true,
			});
		}
	}

	private generateActividadNotifications(now: Date, out: SmartNotification[]): void {
		const actividades = this._actividades();
		if (actividades.length === 0) return;

		const today = this.stripTime(now);

		for (const act of actividades) {
			const fecha = new Date(act.fecha);
			if (isNaN(fecha.getTime())) continue;

			const fechaStripped = this.stripTime(fecha);
			const diffDays = Math.round((fechaStripped.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

			// Only future or today (not past)
			if (diffDays < 0) continue;
			if (diffDays > 7) continue;

			const tipoLabel = this.getTipoLabel(act.tipo);
			let priority: NotificationPriority;
			let message: string;

			if (diffDays === 0) {
				priority = 'urgent';
				message = `${tipoLabel} de ${act.cursoNombre} vence hoy: ${act.titulo}`;
			} else if (diffDays === 1) {
				priority = 'high';
				message = `${tipoLabel} de ${act.cursoNombre} vence mañana: ${act.titulo}`;
			} else if (diffDays <= 3) {
				priority = 'high';
				message = `${tipoLabel} de ${act.cursoNombre} vence en ${diffDays} días: ${act.titulo}`;
			} else {
				priority = 'medium';
				message = `${tipoLabel} de ${act.cursoNombre} vence en ${diffDays} días: ${act.titulo}`;
			}

			out.push({
				id: `smart-actividad-${act.cursoNombre}-${act.titulo}-${act.fecha}`,
				type: 'smart',
				title: `${tipoLabel} próximo`,
				message,
				icon: this.getTipoIcon(act.tipo),
				priority,
				actionUrl: '/intranet/horarios',
				dismissible: true,
			});
		}
	}

	private generateCalificacionNotifications(out: SmartNotification[]): void {
		const current = this._calificaciones();
		const previous = this._previousCalificaciones();
		if (current.length === 0 || previous.length === 0) return;

		const prevMap = new Map(previous.map((c) => [c.evaluacionId, c]));

		for (const cal of current) {
			const prev = prevMap.get(cal.evaluacionId);
			// New grade: was null before, now has value
			if (prev && prev.nota === null && cal.nota !== null) {
				out.push({
					id: `smart-nota-${cal.evaluacionId}`,
					type: 'smart',
					title: 'Nueva nota publicada',
					message: `${cal.cursoNombre}: ${cal.titulo} - Nota: ${cal.nota}`,
					icon: 'pi-chart-bar',
					priority: 'medium',
					actionUrl: '/intranet/horarios',
					dismissible: true,
				});
			}
		}
	}
	// #endregion

	// #region Helpers privados

	private getEntityId(): number | null {
		const user = this.storage.getUser();
		return user?.entityId ?? null;
	}

	private getWeekStart(): string {
		const now = new Date();
		const day = now.getDay();
		const diff = day === 0 ? 6 : day - 1;
		const monday = new Date(now);
		monday.setDate(now.getDate() - diff);
		monday.setHours(0, 0, 0, 0);
		return monday.toISOString().split('T')[0];
	}

	private stripTime(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

	private getTipoLabel(tipo: string): string {
		const labels: Record<string, string> = {
			Tarea: 'Tarea',
			Examen: 'Examen',
			Exposicion: 'Exposición',
			Participacion: 'Participación',
			Otro: 'Actividad',
		};
		return labels[tipo] ?? 'Actividad';
	}

	private getTipoIcon(tipo: string): string {
		const icons: Record<string, string> = {
			Tarea: 'pi-file-edit',
			Examen: 'pi-book',
			Exposicion: 'pi-users',
			Participacion: 'pi-comments',
			Otro: 'pi-calendar',
		};
		return icons[tipo] ?? 'pi-calendar';
	}

	/**
	 * Merge new activities with existing, replacing by cursoNombre
	 * (each course load replaces its own activities).
	 */
	private mergeActividades(existing: ActividadSnapshot[], incoming: ActividadSnapshot[]): ActividadSnapshot[] {
		if (incoming.length === 0) return existing;

		const incomingCursos = new Set(incoming.map((a) => a.cursoNombre));
		const filtered = existing.filter((a) => !incomingCursos.has(a.cursoNombre));
		return [...filtered, ...incoming];
	}

	private async loadFromIndexedDB(): Promise<void> {
		const entityId = this.getEntityId();
		if (!entityId) return;

		try {
			const [horarios, actividades, calificaciones] = await Promise.all([
				this.idb.getSmartData(entityId, 'horarios'),
				this.idb.getSmartData(entityId, 'actividades'),
				this.idb.getSmartData(entityId, 'calificaciones'),
			]);

			if (horarios) this._horarios.set(horarios.data as HorarioSnapshot[]);
			if (actividades) this._actividades.set(actividades.data as ActividadSnapshot[]);
			if (calificaciones) this._calificaciones.set(calificaciones.data as CalificacionSnapshot[]);
		} catch (e) {
			logger.error('[SmartNotification] Error loading from IndexedDB:', e);
		}
	}

	private async cleanup(): Promise<void> {
		try {
			await this.idb.cleanOldSmartData(this.getWeekStart());
		} catch (e) {
			logger.error('[SmartNotification] Error cleaning old data:', e);
		}
	}
	// #endregion

	// #region Cleanup
	destroy(): void {
		this.timerManager.clearAll();
	}
	// #endregion
}
