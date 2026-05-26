import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { TableSkeletonComponent } from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';

import { DashboardCandidatoBlacklist } from '../../models/email-monitoreo.models';

const SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: 'flex', cellType: 'text' },
	{ width: '60px', cellType: 'text' },
	{ width: '140px', cellType: 'text' },
	{ width: '90px', cellType: 'actions' },
];

const BLACKLIST_ROUTE = '/intranet/admin/monitoreo/correos/blacklist';

/**
 * Tile F — Candidatos a blacklist. Defaults del BE (umbralHits/ventanaHoras)
 * desde EmailSettings.MailboxFullThreshold*. CTA "Bloquear" mismo patrón que
 * Tile D (`?action=add&correo=...`).
 */
@Component({
	selector: 'app-candidatos-blacklist-tile',
	standalone: true,
	imports: [DatePipe, ButtonModule, TooltipModule, RouterLink, TableSkeletonComponent],
	templateUrl: './candidatos-blacklist-tile.component.html',
	styleUrl: './candidatos-blacklist-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidatosBlacklistTileComponent {
	readonly items = input<DashboardCandidatoBlacklist[]>([]);
	readonly loading = input<boolean>(false);

	readonly skeletonColumns = SKELETON_COLUMNS;
	readonly blacklistRoute = BLACKLIST_ROUTE;

	readonly hasData = computed(() => this.items().length > 0);

	queryParamsFor(destinatario: string): Record<string, string> {
		return { action: 'add', correo: destinatario };
	}
}
