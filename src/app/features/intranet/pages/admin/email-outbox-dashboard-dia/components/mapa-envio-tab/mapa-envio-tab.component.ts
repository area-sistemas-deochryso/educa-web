import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	OnInit,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { CandidatosBlacklistTileComponent } from '../candidatos-blacklist-tile/candidatos-blacklist-tile.component';
import { DeferFailLiveCounterTileComponent } from '../defer-fail-live-counter-tile/defer-fail-live-counter-tile.component';
import { DominiosReceptoresTileComponent } from '../dominios-receptores-tile/dominios-receptores-tile.component';
import { SenderStatsTileComponent } from '../sender-stats-tile/sender-stats-tile.component';
import { SerieTemporalTileComponent } from '../serie-temporal-tile/serie-temporal-tile.component';
import { TopDestinatariosTileComponent } from '../top-destinatarios-tile/top-destinatarios-tile.component';
import { EmailHubService, EmailMonitoreoFacade } from '../../services';
import { SerieTemporalGranularidad } from '../../models/email-monitoreo.models';

/**
 * Plan 39 Chat C — container del tab "Mapa de envío". Monta los 6 tiles en
 * grid responsivo, conecta el hub SignalR y dispara `MessageService` ante
 * `BlacklistEntryCreated` (D5).
 */
@Component({
	selector: 'app-mapa-envio-tab',
	standalone: true,
	imports: [
		ToastModule,
		DeferFailLiveCounterTileComponent,
		SenderStatsTileComponent,
		TopDestinatariosTileComponent,
		SerieTemporalTileComponent,
		DominiosReceptoresTileComponent,
		CandidatosBlacklistTileComponent,
	],
	providers: [MessageService],
	templateUrl: './mapa-envio-tab.component.html',
	styleUrl: './mapa-envio-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaEnvioTabComponent implements OnInit, OnDestroy {
	private facade = inject(EmailMonitoreoFacade);
	private hub = inject(EmailHubService);
	private destroyRef = inject(DestroyRef);
	private messageService = inject(MessageService);

	readonly vm = this.facade.vm;
	readonly hubConnected = this.facade.hubConnected;

	ngOnInit(): void {
		this.facade.loadAll();
		this.subscribeToToasts();
		this.facade.startHub().catch(() => {
			// El facade ya degrada a polling y loggea — no propagar.
		});
	}

	ngOnDestroy(): void {
		this.facade.stopHub();
	}

	onGranularidadChange(value: SerieTemporalGranularidad): void {
		this.facade.setGranularidad(value);
	}

	private subscribeToToasts(): void {
		this.hub.blacklistEntryCreated$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => {
				this.messageService.add({
					severity: 'warn',
					summary: 'Bloqueo automático',
					detail: `${evt.correoEnmascarado} fue agregado a blacklist (${evt.motivo}).`,
					life: 8000,
				});
			});

		this.hub.candidatoBlacklistDetectado$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => {
				this.messageService.add({
					severity: 'info',
					summary: 'Candidato a blacklist',
					detail: `${evt.correoEnmascarado} llegó a ${evt.hitsActuales}/${evt.thresholdHits} hits.`,
					life: 6000,
				});
			});
	}
}
