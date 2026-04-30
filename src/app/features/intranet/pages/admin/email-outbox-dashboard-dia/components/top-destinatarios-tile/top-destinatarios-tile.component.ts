import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

import { DashboardTopDestinatario } from '../../models/email-monitoreo.models';

const SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: 'flex', cellType: 'text' },
	{ width: '70px', cellType: 'text' },
	{ width: '60px', cellType: 'text' },
	{ width: '60px', cellType: 'text' },
	{ width: '60px', cellType: 'text' },
	{ width: '90px', cellType: 'actions' },
];

const BLACKLIST_ROUTE = '/intranet/admin/monitoreo/correos/blacklist';

/**
 * Tile D — Top destinatarios fallidos. CTA "Bloquear" navega a tab Blacklist
 * con `?action=add&correo=...` para que el dialog del Plan 38 Chat 5 prefille.
 */
@Component({
	selector: 'app-top-destinatarios-tile',
	standalone: true,
	imports: [ButtonModule, TagModule, TooltipModule, RouterLink, TableSkeletonComponent],
	templateUrl: './top-destinatarios-tile.component.html',
	styleUrl: './top-destinatarios-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopDestinatariosTileComponent {
	readonly items = input<DashboardTopDestinatario[]>([]);
	readonly loading = input<boolean>(false);
	readonly ventanaDias = input<number>(7);

	readonly skeletonColumns = SKELETON_COLUMNS;
	readonly blacklistRoute = BLACKLIST_ROUTE;

	readonly hasData = computed(() => this.items().length > 0);

	queryParamsFor(destinatario: string): Record<string, string> {
		return { action: 'add', correo: destinatario };
	}
}
