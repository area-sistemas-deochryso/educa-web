import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { TagModule } from 'primeng/tag';

import { SkeletonLoaderComponent } from '@shared/components';
import { DeferFailStatus } from '@features/intranet/pages/admin/email-outbox/models/defer-fail-status.models';

type LevelSeverity = 'success' | 'warn' | 'danger';

/**
 * Tile A — defer-fail live counter. Reusa el contrato del DeferFailStatusWidget
 * pero con visual compacto para tile-grid del Mapa de envío. Se actualiza por
 * push SignalR (`DeferFailStatusUpdated`); fallback polling 30s en el facade.
 */
@Component({
	selector: 'app-defer-fail-live-counter-tile',
	standalone: true,
	imports: [TagModule, SkeletonLoaderComponent],
	templateUrl: './defer-fail-live-counter-tile.component.html',
	styleUrl: './defer-fail-live-counter-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeferFailLiveCounterTileComponent {
	readonly status = input<DeferFailStatus | null>(null);
	readonly loading = input<boolean>(false);
	readonly hubConnected = input<boolean>(false);

	readonly hasData = computed(() => this.status() !== null);

	readonly counter = computed(() => this.status()?.currentHour.deferFailCount ?? 0);
	readonly threshold = computed(() => this.status()?.currentHour.threshold ?? 5);
	readonly percent = computed(() => {
		const s = this.status();
		if (!s) return 0;
		return Math.min(100, Math.round(s.currentHour.percentUsed));
	});

	readonly level = computed<LevelSeverity>(() => {
		switch (this.status()?.status) {
			case 'CRITICAL':
				return 'danger';
			case 'WARNING':
				return 'warn';
			default:
				return 'success';
		}
	});

	readonly levelLabel = computed(() => this.status()?.status ?? 'OK');

	readonly subtitle = computed(() => {
		const c = this.counter();
		const t = this.threshold();
		return `${c} / ${t} fails en la hora actual`;
	});
}
