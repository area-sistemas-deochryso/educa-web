import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import { EmailDeferEventDto } from '@data/models/email-defer-event.models';

import { EmailDeferEventsService } from '../../services';

/**
 * Plan 37 Chat 3 — banner crítico (B9) que aparece cuando hay un evento
 * `DOMAIN_BLOCKED` en las últimas 12h.
 *
 * Diseñado contra `EmailHub.DomainBlockedDetected` (push SignalR), pero ese
 * evento aún no está expuesto por el hub BE (Plan 39 Chat B publica solo 3:
 * BlacklistEntryCreated / DeferFailStatusUpdated / CandidatoBlacklistDetectado).
 *
 * Fallback elegido: **polling al endpoint `defer-events`** filtrando por tipo
 * `DOMAIN_BLOCKED` y rango últimas 12h. El componente queda preparado para
 * suscribirse al observable de `EmailHub` cuando el BE agregue el evento.
 */
@Component({
	selector: 'app-domain-blocked-alert-banner',
	standalone: true,
	imports: [DatePipe],
	templateUrl: './domain-blocked-alert-banner.component.html',
	styleUrl: './domain-blocked-alert-banner.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainBlockedAlertBannerComponent implements OnInit {
	private readonly api = inject(EmailDeferEventsService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly _events = signal<EmailDeferEventDto[]>([]);
	readonly events = this._events.asReadonly();

	readonly latest = computed(() => this._events()[0] ?? null);
	readonly hasEvents = computed(() => this._events().length > 0);

	ngOnInit(): void {
		this.loadLast12h();
	}

	private loadLast12h(): void {
		const desde = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
		this.api
			.getPaginado(
				{ desde, hasta: null, tipo: 'DOMAIN_BLOCKED', dominio: null },
				1,
				10,
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => this._events.set(result.data),
				error: (err) => {
					logger.warn('[DomainBlockedAlertBanner] Error consultando defer-events', err);
				},
			});
	}
}
