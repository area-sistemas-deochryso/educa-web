// #region Imports
import { Component, ChangeDetectionStrategy, inject, OnInit, computed, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { EstudianteHorariosFacade } from './services/estudiante-horarios.facade';
import { EstudianteApiService } from '../services/estudiante-api.service';
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

const HORA_INICIO_DIA = 7 * 60;
const PX_PER_HOUR = 60;

function buildBlocks(horarios: HorarioProfesorDto[]): HorarioBlock[] {
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
			cantidadEstudiantes: h.cantidadEstudiantes,
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

function getNextOccurrence(block: HorarioBlock, now: Date): Date {
	const jsDay = now.getDay();
	const todayDia = jsDay >= 1 && jsDay <= 5 ? jsDay : 0;
	const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
	const startMin = timeToMinutes(block.horaInicio);

	if (todayDia === block.dia && startMin > nowMinutes) {
		const d = new Date(now);
		d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
		return d;
	}

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
	selector: 'app-estudiante-horarios',
	standalone: true,
	imports: [CommonModule, TooltipModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-horarios.component.html',
	styleUrl: './estudiante-horarios.component.scss',
})
export class EstudianteHorariosComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(EstudianteHorariosFacade);
	private readonly api = inject(EstudianteApiService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	// #endregion
	// #region Estado
	readonly vm = this.facade.vm;

	readonly weeklyBlocks = computed<HorarioBlock[]>(() =>
		buildBlocks(this.vm().horarios),
	);

	// #endregion
	// #region Countdown (server-synced)
	private readonly _now = signal(Date.now());
	private readonly _serverOffset = signal(0);
	private _lastSyncPerfMs = 0;
	private _lastSyncDateMs = 0;
	private _syncing = false;

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

		const interval = setInterval(() => {
			this._now.set(Date.now());
			this.checkClockDrift();
		}, 1000);
		this.destroyRef.onDestroy(() => clearInterval(interval));
	}

	// #endregion
	// #region Server time sync
	private syncServerTime(): void {
		if (this._syncing) return;
		this._syncing = true;

		this.api.getServerTime().subscribe({
			next: (isoStr) => {
				if (isoStr) {
					const serverMs = new Date(isoStr).getTime();
					if (!isNaN(serverMs)) {
						this.applyOffset(serverMs);
						return;
					}
				}
				this.syncViaDateHeader();
			},
			error: () => this.syncViaDateHeader(),
		});
	}

	private syncViaDateHeader(): void {
		fetch('/api/EstudianteCurso/mis-horarios', { method: 'HEAD', credentials: 'include' })
			.then((res) => {
				const dateStr = res.headers.get('Date');
				if (dateStr) {
					this.applyOffset(new Date(dateStr).getTime());
				} else {
					this._syncing = false;
				}
			})
			.catch(() => {
				this._syncing = false;
			});
	}

	private applyOffset(serverMs: number): void {
		this._serverOffset.set(serverMs - Date.now());
		this._lastSyncPerfMs = performance.now();
		this._lastSyncDateMs = Date.now();
		this._syncing = false;
	}

	private checkClockDrift(): void {
		if (this._syncing || this._lastSyncPerfMs === 0) return;

		const elapsedPerf = performance.now() - this._lastSyncPerfMs;
		const elapsedDate = Date.now() - this._lastSyncDateMs;
		const drift = Math.abs(elapsedDate - elapsedPerf);

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
	verCursoContenido(block: HorarioBlock): void {
		this.router.navigate(['/intranet/estudiante/cursos'], {
			queryParams: { horarioId: block.id },
		});
	}
	// #endregion
}
// #endregion
