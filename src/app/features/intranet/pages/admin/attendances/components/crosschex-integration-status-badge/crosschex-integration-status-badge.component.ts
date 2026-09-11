import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';

import { EduTag, EduTooltip } from '@edu-ui';
import {
	CrossChexIntegrationStatusDto,
	CrossChexIntegrationStatusService,
} from '../../services/crosschex-integration-status.service';

/** Refresco del badge — no necesita ser más agresivo que el watchdog del backend (15 min). */
const POLL_INTERVAL_MS = 60_000;
const DEGRADED_THRESHOLD_MINUTES = 30;

/**
 * P10 F3 (DEP-4) — indicador pasivo de "última sincronización biométrica"
 * en la vista de asistencia diaria. Distinto de `CrossChexSyncBannerComponent`
 * (que muestra el progreso de un sync MANUAL disparado por un admin vía
 * SignalR): este badge refleja el estado del job AUTOMÁTICO (Hangfire,
 * corre solo cada 5-10 min entre 6:00-18:59) consultando
 * `GET /api/sistema/integration-status` cada 60s.
 */
@Component({
	selector: 'app-crosschex-integration-status-badge',
	standalone: true,
	imports: [EduTag, EduTooltip],
	templateUrl: './crosschex-integration-status-badge.component.html',
	styleUrl: './crosschex-integration-status-badge.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrossChexIntegrationStatusBadgeComponent {
	private statusService = inject(CrossChexIntegrationStatusService);
	private destroyRef = inject(DestroyRef);

	readonly status = signal<CrossChexIntegrationStatusDto | null>(null);

	constructor() {
		interval(POLL_INTERVAL_MS)
			.pipe(
				startWith(0),
				switchMap(() => this.statusService.getStatus().pipe(catchError(() => of(null)))),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((status) => this.status.set(status));
	}

	get isDegraded(): boolean {
		const s = this.status();
		return s?.estado === 'DEGRADADO';
	}

	get label(): string {
		const s = this.status();
		if (!s) return 'Estado CrossChex desconocido';
		if (s.minutosSinExito === null) return 'Sin sincronización biométrica registrada';

		const minutos = Math.round(s.minutosSinExito);
		const texto = this.formatearMinutos(minutos);
		return s.estado === 'DEGRADADO'
			? `Última sincronización biométrica: hace ${texto} — CrossChex no responde`
			: `Última sincronización biométrica: hace ${texto}`;
	}

	get tooltip(): string {
		const s = this.status();
		if (!s) return '';
		const detalle = s.fallosConsecutivos > 0
			? ` (${s.fallosConsecutivos} fallo${s.fallosConsecutivos === 1 ? '' : 's'} consecutivo${s.fallosConsecutivos === 1 ? '' : 's'})`
			: '';
		return s.estado === 'DEGRADADO'
			? `CrossChex lleva más de ${DEGRADED_THRESHOLD_MINUTES} min sin sincronizar${detalle}. La asistencia manual sigue funcionando con normalidad.`
			: 'La sincronización automática con CrossChex está al día.';
	}

	private formatearMinutos(minutos: number): string {
		if (minutos < 1) return 'menos de 1 minuto';
		if (minutos < 60) return `${minutos} minuto${minutos === 1 ? '' : 's'}`;
		const horas = Math.floor(minutos / 60);
		const restoMin = minutos % 60;
		const horasTexto = `${horas} hora${horas === 1 ? '' : 's'}`;
		return restoMin > 0 ? `${horasTexto} ${restoMin}min` : horasTexto;
	}
}
