import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';

import { CrossChexSyncStatusService } from '@core/services/signalr';

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
	imports: [CommonModule, ButtonModule, ProgressBarModule],
	templateUrl: './crosschex-sync-banner.component.html',
	styleUrl: './crosschex-sync-banner.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrossChexSyncBannerComponent {
	// #region Dependencias
	private syncService = inject(CrossChexSyncStatusService);
	// #endregion

	// #region Outputs
	/** Emite cuando el usuario clickea "Reintentar" tras un FAILED. */
	readonly retry = output<void>();
	/** Emite cuando el usuario clickea "Cerrar" tras un FAILED (clear del banner). */
	readonly dismiss = output<void>();
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
	readonly indeterminate = computed(() => {
		const s = this.status();
		if (!s) return false;
		if (s.estado === 'QUEUED') return true;
		if (s.estado === 'RUNNING' && (!s.totalPaginas || !s.pagina)) return true;
		return false;
	});

	readonly percent = computed(() => {
		const s = this.status();
		if (!s || !s.pagina || !s.totalPaginas) return 0;
		return Math.round((s.pagina / s.totalPaginas) * 100);
	});

	readonly mensaje = computed(() => {
		const s = this.status();
		if (!s) return '';

		switch (s.estado) {
			case 'QUEUED':
				return 'Encolando sincronización…';
			case 'RUNNING':
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
	readonly fase = computed(() => this.status()?.fase ?? '');
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
