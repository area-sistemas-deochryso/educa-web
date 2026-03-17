// #region Imports
import { Component, ChangeDetectionStrategy, inject, OnInit, computed, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '@config/environment';
import { ProfesorFacade } from '../services/profesor.facade';
import { ProfesorApiService } from '../services/profesor-api.service';
import { HorarioProfesorDto } from '../models';

// #endregion
// #region Block interface
interface HorarioBlock {
	id: number;
	cursoNombre: string;
	horaInicio: string;
	horaFin: string;
	salonId: number;
	salonDescripcion: string;
	cantidadEstudiantes: number;
	dia: number;
	color: string;
	borderColor: string;
	topPx: number;
	heightPx: number;
}

type CountdownUrgency = 'normal' | 'warning' | 'danger-low' | 'danger';

interface CountdownInfo {
	blockId: number;
	label: string;
	urgency: CountdownUrgency;
}

// #endregion
// #region Helpers
const CURSO_COLORS = [
	'#3B82F6', '#10B981', '#F59E0B', '#EF4444',
	'#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

function darkenColor(hex: string): string {
	const num = parseInt(hex.replace('#', ''), 16);
	const r = Math.max(0, (num >> 16) - 40);
	const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
	const b = Math.max(0, (num & 0x0000ff) - 40);
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const HORA_INICIO_DIA = 7 * 60; // 07:00 en minutos
const PX_PER_HOUR = 60;

function buildBlocks(
	horarios: HorarioProfesorDto[],
	estudiantesPorSalon: Map<number, number>,
): HorarioBlock[] {
	const colorMap = new Map<number, string>();
	let colorIdx = 0;

	return horarios.map((h) => {
		if (!colorMap.has(h.cursoId)) {
			colorMap.set(h.cursoId, CURSO_COLORS[colorIdx % CURSO_COLORS.length]);
			colorIdx++;
		}

		const [hi, mi] = h.horaInicio.split(':').map(Number);
		const [hf, mf] = h.horaFin.split(':').map(Number);
		const startMin = hi * 60 + mi;
		const endMin = hf * 60 + mf;
		const duration = endMin - startMin;
		const offset = startMin - HORA_INICIO_DIA;
		const color = colorMap.get(h.cursoId) || CURSO_COLORS[0];

		return {
			id: h.id,
			cursoNombre: h.cursoNombre,
			horaInicio: h.horaInicio,
			horaFin: h.horaFin,
			salonId: h.salonId,
			salonDescripcion: h.salonDescripcion,
			cantidadEstudiantes: estudiantesPorSalon.get(h.salonId) ?? h.cantidadEstudiantes,
			dia: h.diaSemana,
			color,
			borderColor: darkenColor(color),
			topPx: (offset / 60) * PX_PER_HOUR,
			heightPx: (duration / 60) * PX_PER_HOUR,
		};
	});
}

function timeToMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}

function getUrgency(remainingMs: number): CountdownUrgency {
	const mins = remainingMs / 60_000;
	if (mins < 10) return 'danger';
	if (mins < 30) return 'danger-low';
	if (mins < 60) return 'warning';
	return 'normal';
}

function formatCountdown(remainingMs: number): string {
	const totalSecs = Math.max(0, Math.floor(remainingMs / 1000));
	const d = Math.floor(totalSecs / 86400);
	const h = Math.floor((totalSecs % 86400) / 3600);
	const m = Math.floor((totalSecs % 3600) / 60);
	const s = totalSecs % 60;

	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

/** Calculate the next occurrence date for a block's day+time relative to now */
function getNextOccurrence(block: HorarioBlock, now: Date): Date {
	const jsDay = now.getDay(); // 0=Sun..6=Sat
	const todayDia = jsDay >= 1 && jsDay <= 5 ? jsDay : 0;
	const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
	const startMin = timeToMinutes(block.horaInicio);

	// If it's today and hasn't started yet
	if (todayDia === block.dia && startMin > nowMinutes) {
		const d = new Date(now);
		d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
		return d;
	}

	// Find next occurrence (1-7 days ahead)
	for (let offset = 1; offset <= 7; offset++) {
		const target = new Date(now);
		target.setDate(target.getDate() + offset);
		const targetJsDay = target.getDay();
		const targetDia = targetJsDay >= 1 && targetJsDay <= 5 ? targetJsDay : 0;
		if (targetDia === block.dia) {
			target.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
			return target;
		}
	}

	// Fallback: next week same day
	const fallback = new Date(now);
	fallback.setDate(fallback.getDate() + 7);
	fallback.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
	return fallback;
}

function buildCountdownMap(blocks: HorarioBlock[], now: Date): Map<number, CountdownInfo> {
	const map = new Map<number, CountdownInfo>();
	for (const block of blocks) {
		const nextDate = getNextOccurrence(block, now);
		const remainingMs = nextDate.getTime() - now.getTime();
		map.set(block.id, {
			blockId: block.id,
			label: formatCountdown(remainingMs),
			urgency: getUrgency(remainingMs),
		});
	}
	return map;
}

// #endregion
// #region Component
@Component({
	selector: 'app-profesor-horarios',
	standalone: true,
	imports: [CommonModule, TooltipModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './profesor-horarios.component.html',
	styleUrl: './profesor-horarios.component.scss',
})
export class ProfesorHorariosComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly api = inject(ProfesorApiService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	// #endregion
	// #region Estado
	readonly vm = this.facade.vm;

	/** Map salonId → cantidadEstudiantes from misEstudiantes (real count) */
	private readonly estudiantesPorSalon = computed(() => {
		const map = new Map<number, number>();
		for (const s of this.vm().salonesConEstudiantes) {
			map.set(s.salonId, s.cantidadEstudiantes);
		}
		return map;
	});

	readonly weeklyBlocks = computed<HorarioBlock[]>(() =>
		buildBlocks(this.vm().horarios, this.estudiantesPorSalon()),
	);

	// #endregion
	// #region Mobile view
	readonly selectedDay = signal(this.getCurrentWeekday());
	readonly selectedDayBlocks = computed(() =>
		this.weeklyBlocks()
			.filter((b) => b.dia === this.selectedDay())
			.sort((a, b) => a.topPx - b.topPx),
	);

	private getCurrentWeekday(): number {
		const jsDay = new Date().getDay();
		return jsDay >= 1 && jsDay <= 5 ? jsDay : 1;
	}

	selectDay(day: number): void {
		this.selectedDay.set(day);
	}

	// #endregion
	// #region Countdown (server-synced)
	private readonly _now = signal(Date.now());
	/** Offset in ms: serverTime - localTime. Applied to local clock for accurate countdown. */
	private readonly _serverOffset = signal(0);
	/** Tracks performance.now() and Date.now() at last sync to detect clock drift */
	private _lastSyncPerfMs = 0;
	private _lastSyncDateMs = 0;
	private _syncing = false;

	// #region Debug (controlled by environment.debug.horarioSync)
	readonly showDebugSync = environment.debug.horarioSync;
	private readonly _rawServerResponse = signal<string>('(pending)');
	private readonly _syncSource = signal<string>('none');
	private readonly _syncError = signal<string>('');

	readonly debugInfo = computed(() => {
		if (!this.showDebugSync) return null;

		const now = this._now();
		const offset = this._serverOffset();
		const corrected = now + offset;
		const driftMs = this._lastSyncPerfMs > 0
			? Math.abs((Date.now() - this._lastSyncDateMs) - (performance.now() - this._lastSyncPerfMs))
			: 0;

		return {
			localTime: new Date(now).toLocaleString('es-PE', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
			localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			correctedTime: new Date(corrected).toLocaleString('es-PE'),
			offsetMs: offset,
			offsetFormatted: `${offset > 0 ? '+' : ''}${Math.round(offset / 1000)}s (${Math.round(offset / 60_000)}min)`,
			driftMs: Math.round(driftMs),
			driftOver20min: driftMs > 20 * 60_000,
			rawServerResponse: this._rawServerResponse(),
			syncSource: this._syncSource(),
			syncError: this._syncError(),
			jsDay: new Date(corrected).getDay(),
			correctedHours: new Date(corrected).getHours(),
			correctedMinutes: new Date(corrected).getMinutes(),
		};
	});
	// #endregion

	readonly countdownMap = computed<Map<number, CountdownInfo>>(() =>
		buildCountdownMap(this.weeklyBlocks(), new Date(this._now() + this._serverOffset())),
	);

	// #endregion
	// #region Constantes
	readonly DIAS = [
		{ label: 'Lunes', short: 'Lun', value: 1 },
		{ label: 'Martes', short: 'Mar', value: 2 },
		{ label: 'Miércoles', short: 'Mié', value: 3 },
		{ label: 'Jueves', short: 'Jue', value: 4 },
		{ label: 'Viernes', short: 'Vie', value: 5 },
	];

	readonly HORAS = [
		'07:00', '08:00', '09:00', '10:00', '11:00',
		'12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
	];

	// #endregion
	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadData();
		this.syncServerTime();

		// Tick every second + detect local clock drift
		const interval = setInterval(() => {
			this._now.set(Date.now());
			this.checkClockDrift();
		}, 1000);
		this.destroyRef.onDestroy(() => clearInterval(interval));
	}

	// #endregion
	// #region Server time sync
	/**
	 * Two-tier server time sync:
	 * 1. Try dedicated /api/ServerTime endpoint
	 * 2. Fallback: extract Date header from any API response
	 * Handles both wrong date AND wrong time on the device.
	 */
	private syncServerTime(): void {
		if (this._syncing) return;
		this._syncing = true;
		this._syncError.set('');

		this.api.getServerTime().subscribe({
			next: (isoStr) => {
				this._rawServerResponse.set(JSON.stringify(isoStr));
				if (isoStr) {
					const serverMs = new Date(isoStr).getTime();
					if (!isNaN(serverMs)) {
						this._syncSource.set('dedicated /api/ServerTime');
						this.applyOffset(serverMs);
						return;
					}
					this._syncError.set(`Parsed NaN from: ${isoStr}`);
				} else {
					this._syncError.set('getServerTime returned null');
				}
				// Dedicated endpoint unavailable — fallback to Date header
				this.syncViaDateHeader();
			},
			error: (err) => {
				this._rawServerResponse.set(`ERROR: ${err?.message || err}`);
				this._syncError.set(`subscribe error: ${err?.message || err}`);
				this.syncViaDateHeader();
			},
		});
	}

	/** Extract server time from the Date response header of any existing API endpoint */
	private syncViaDateHeader(): void {
		fetch('/api/Profesor/mis-estudiantes', { method: 'HEAD', credentials: 'include' })
			.then((res) => {
				const dateStr = res.headers.get('Date');
				if (dateStr) {
					this._syncSource.set(`Date header: ${dateStr}`);
					this.applyOffset(new Date(dateStr).getTime());
				} else {
					this._syncSource.set('Date header: (null)');
					this._syncError.set('No Date header in response');
					this._syncing = false;
				}
			})
			.catch((err) => {
				this._syncSource.set('fallback failed');
				this._syncError.set(`fetch error: ${err?.message || err}`);
				this._syncing = false;
			});
	}

	private applyOffset(serverMs: number): void {
		this._serverOffset.set(serverMs - Date.now());
		this._lastSyncPerfMs = performance.now();
		this._lastSyncDateMs = Date.now();
		this._syncing = false;
	}

	/** Detect system clock adjustment by comparing monotonic vs wall clock elapsed time */
	private checkClockDrift(): void {
		if (this._syncing || this._lastSyncPerfMs === 0) return;

		const elapsedPerf = performance.now() - this._lastSyncPerfMs;
		const elapsedDate = Date.now() - this._lastSyncDateMs;
		const drift = Math.abs(elapsedDate - elapsedPerf);

		// Re-sync if local clock jumped by more than 20 minutes
		if (drift > 20 * 60_000) {
			this.syncServerTime();
		}
	}

	// #endregion
	// #region Helpers
	getBlocksForDay(dia: number): HorarioBlock[] {
		return this.weeklyBlocks().filter((b) => b.dia === dia);
	}

	getBlockStyle(block: HorarioBlock): Record<string, string> {
		return {
			top: `${block.topPx}px`,
			height: `${block.heightPx}px`,
			background: block.color,
			borderLeft: `4px solid ${block.borderColor}`,
		};
	}

	getTooltipContent(block: HorarioBlock): string {
		return `${block.horaInicio} - ${block.horaFin}\n${block.salonDescripcion}`;
	}

	// #endregion
	// #region Event handlers
	verAsistencia(block: HorarioBlock): void {
		this.router.navigate(['/intranet/profesor/cursos'], {
			queryParams: { horarioId: block.id, tab: '3' },
		});
	}
	// #endregion
}
// #endregion
