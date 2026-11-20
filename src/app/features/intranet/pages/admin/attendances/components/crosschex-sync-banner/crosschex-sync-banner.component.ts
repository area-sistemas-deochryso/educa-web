import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	output,
	signal,
} from '@angular/core';
import { CrossChexSyncStatusService } from '@core/services/signalr';
import { EduButton, EduProgressBar } from '@edu-ui';

const DEFAULT_DELAY_S = 16;
/** QUEUED sin arrancar tras este tiempo => nadie está procesando el job (p. ej. Hangfire apagado en local). */
const QUEUED_STALL_MS = 45_000;
/** RUNNING sin ningún evento nuevo tras este tiempo => el job dejó de avanzar. */
const RUNNING_STALL_MS = 90_000;
const STALL_CHECK_MS = 5_000;

/**
 * Plan 24 Chat 3 — Banner full-width que muestra el progreso del sync
 * CrossChex en tiempo real. Se consume via `<app-crosschex-sync-banner />`
 * en `attendances.component.html` y lee el estado directo del servicio
 * singleton (`CrossChexSyncStatusService`).
 *
 * Fases visuales:
 *   - QUEUED:    bar indeterminate + "Encolando sincronización…"
 *   - RUNNING:   bar determinate (% = pagina / totalPaginas) + mensaje dinámico
 *   - FAILED:    banner rojo + botón "Reintentar" + error del DTO
 *   - COMPLETED: no se renderiza (el servicio ya lo oculta via hasActiveJob())
 */
@Component({
	selector: 'app-crosschex-sync-banner',
	standalone: true,
	imports: [EduButton, EduProgressBar],
	templateUrl: './crosschex-sync-banner.component.html',
	styleUrl: './crosschex-sync-banner.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrossChexSyncBannerComponent {
	// #region Dependencias
	private syncService = inject(CrossChexSyncStatusService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Outputs
	readonly retry = output<void>();
	readonly dismiss = output<void>();
	// #endregion

	// #region Detección de bloqueo
	private readonly _now = signal(Date.now());
	private readonly _lastEventAt = signal(Date.now());

	/**
	 * `true` si hay un job activo (QUEUED/RUNNING) que no está avanzando. El BE no
	 * publica un estado "bloqueado": en local (`Development`) no corre el servidor de
	 * Hangfire y el job queda encolado para siempre, así que se infiere por inactividad.
	 */
	readonly isStalled = computed(() => {
		const s = this.status();
		if (!s || (s.estado !== 'QUEUED' && s.estado !== 'RUNNING')) return false;
		const now = this._now();
		if (s.estado === 'QUEUED') {
			// `iniciadoEn` viene en hora Perú sin offset (UTC-5).
			const started = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(s.iniciadoEn) ? s.iniciadoEn : `${s.iniciadoEn}-05:00`);
			const since = Number.isNaN(started) ? this._lastEventAt() : started;
			return now - since > QUEUED_STALL_MS;
		}
		return now - this._lastEventAt() > RUNNING_STALL_MS;
	});
	// #endregion

	// #region Countdown
	private readonly _countdownSeconds = signal(0);
	private countdownInterval: ReturnType<typeof setInterval> | null = null;

	readonly countdownDisplay = computed(() => {
		const s = this._countdownSeconds();
		if (s <= 0 || this.isStalled()) return '';
		const min = Math.floor(s / 60);
		const sec = s % 60;
		return min > 0
			? `~${min}m ${sec.toString().padStart(2, '0')}s restantes`
			: `~${sec}s restantes`;
	});

	constructor() {
		effect(() => {
			const s = this.status();
			if (!s || s.estado !== 'RUNNING') {
				this.stopCountdown();
				return;
			}
			const remaining = this.estimateRemainingSeconds(s);
			if (remaining > 0) this.startCountdown(remaining);
		});

		// Cada emisión del servicio (aunque llegue idéntica) cuenta como señal de vida.
		effect(() => {
			this.status();
			this._lastEventAt.set(Date.now());
		});

		const stallTimer = setInterval(() => this._now.set(Date.now()), STALL_CHECK_MS);

		this.destroyRef.onDestroy(() => {
			this.stopCountdown();
			clearInterval(stallTimer);
		});
	}

	private estimateRemainingSeconds(s: {
		diaActual: number | null;
		totalDias: number | null;
		pagina: number | null;
		totalPaginas: number | null;
		delayEntrePasosSegundos: number | null;
	}): number {
		const delay = s.delayEntrePasosSegundos ?? DEFAULT_DELAY_S;
		const pagesLeft =
			s.pagina && s.totalPaginas ? Math.max(0, s.totalPaginas - s.pagina) : 0;
		const daysLeft =
			s.diaActual && s.totalDias ? Math.max(0, s.totalDias - s.diaActual) : 0;
		return (pagesLeft + daysLeft) * delay;
	}

	private startCountdown(seconds: number): void {
		this.stopCountdown();
		this._countdownSeconds.set(seconds);
		this.countdownInterval = setInterval(() => {
			this._countdownSeconds.update((v) => {
				if (v <= 1) {
					this.stopCountdown();
					return 0;
				}
				return v - 1;
			});
		}, 1000);
	}

	private stopCountdown(): void {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
	}
	// #endregion

	// #region Estado derivado
	readonly status = this.syncService.status;
	readonly hasActiveJob = this.syncService.hasActiveJob;

	/** `true` si hay status (activo o terminal FAILED que aún no se limpió). */
	readonly visible = computed(() => {
		const s = this.status();
		if (!s) return false;
		// Ocultar si ya completó con éxito. El FAILED queda visible hasta que el user lo cierre.
		return s.estado !== 'COMPLETED';
	});

	readonly isFailed = computed(() => this.status()?.estado === 'FAILED');
	readonly isQueued = computed(() => this.status()?.estado === 'QUEUED');
	readonly isRunning = computed(() => this.status()?.estado === 'RUNNING');

	/**
	 * `true` si el bar debe mostrarse como indeterminate:
	 *   - QUEUED
	 *   - RUNNING sin totalPaginas todavía
	 *   - FAILED (no se muestra bar)
	 */
	readonly isRangeSync = computed(() => {
		const s = this.status();
		return !!s && s.totalDias != null && s.totalDias > 1;
	});

	readonly indeterminate = computed(() => {
		const s = this.status();
		if (!s) return false;
		if (s.estado === 'QUEUED') return true;
		if (s.estado === 'RUNNING' && (!s.totalPaginas || !s.pagina)) return true;
		return false;
	});

	readonly percent = computed(() => {
		const s = this.status();
		if (!s) return 0;
		if (this.isRangeSync() && s.diaActual && s.totalDias) {
			return Math.round((s.diaActual / s.totalDias) * 100);
		}
		if (!s.pagina || !s.totalPaginas) return 0;
		return Math.round((s.pagina / s.totalPaginas) * 100);
	});

	readonly dayProgress = computed(() => {
		const s = this.status();
		if (!this.isRangeSync() || !s?.diaActual || !s.totalDias) return '';
		return `Día ${s.diaActual}/${s.totalDias}`;
	});

	readonly pageProgress = computed(() => {
		const s = this.status();
		if (!s?.pagina || !s.totalPaginas) return '';
		return `Página ${s.pagina}/${s.totalPaginas} — esperando CrossChex…`;
	});

	readonly mensaje = computed(() => {
		const s = this.status();
		if (!s) return '';

		if (this.isStalled()) {
			return 'No hay avance: el proceso de sincronización no está respondiendo, no se está descargando nada. Cierra este aviso y vuelve a intentarlo más tarde.';
		}

		switch (s.estado) {
			case 'QUEUED':
				return 'Encolando sincronización…';
			case 'RUNNING':
				if (this.isRangeSync()) {
					const day = this.dayProgress();
					const page = this.pageProgress();
					if (day && page) return `${day} · ${page}`;
					if (day) return day;
				}
				if (s.pagina && s.totalPaginas) {
					return `Descargando página ${s.pagina}/${s.totalPaginas} — esperando CrossChex…`;
				}
				return s.mensaje ?? 'Iniciando…';
			case 'FAILED':
				return s.error ?? s.mensaje ?? 'Error al sincronizar';
			default:
				return s.mensaje ?? '';
		}
	});

	/** Subtexto con la fase (Descargando / Procesando / …). Vacío si no hay fase. */
	readonly fase = computed(() => (this.isStalled() ? '' : (this.status()?.fase ?? '')));
	// #endregion

	// #region Event handlers
	onRetry(): void {
		this.retry.emit();
	}

	onDismiss(): void {
		this.dismiss.emit();
	}
	// #endregion
}
