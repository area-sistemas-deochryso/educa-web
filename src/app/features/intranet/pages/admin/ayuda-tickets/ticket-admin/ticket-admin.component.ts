// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { PageHeaderComponent } from '@intranet-shared/components';
import { UserPermissionsService } from '@core/services';

import { TicketBandejaComponent } from '../ticket-bandeja/ticket-bandeja.component';
import { TicketTiposComponent } from '../ticket-tipos/ticket-tipos.component';
import { EduTab, EduTabs } from '@edu-ui';
// #endregion

const AYUDA_TICKET_MANAGE = 'AYUDA_TICKET_MANAGE';

type TicketAdminTab = 'bandeja' | 'tipos';

/**
 * Shell de las 2 vistas admin del dominio Ticket (bandeja + catálogo de tipos),
 * ambas gateadas por la MISMA capability `AYUDA_TICKET_MANAGE` (F7a no creó una
 * capability separada para el catálogo). El catálogo de capabilities del BE
 * asocia una única `CAP_Ruta` por capability (`intranet/admin/ayuda/tickets`,
 * seedeada en `20260724_CreateTicketTables.sql`) — el `permissionsGuard`
 * (`canActivateChild` de todas las rutas `admin/*`) hace match exacto contra
 * esa ruta. Por eso las 2 vistas viven bajo UNA sola ruta con tabs por
 * queryParam, mismo patrón que `AttendancesComponent` (Gestión/Reportes/Panel),
 * en vez de 2 rutas hijas — 2 rutas exigirían 2 capabilities (fuera de alcance
 * del brief 484, que reusa `AYUDA_TICKET_MANAGE` explícitamente).
 */
@Component({
	selector: 'app-ticket-admin',
	standalone: true,
	imports: [EduTabs, EduTab, PageHeaderComponent, TicketBandejaComponent, TicketTiposComponent],
	templateUrl: './ticket-admin.component.html',
	styleUrl: './ticket-admin.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketAdminComponent {
	// #region Dependencies
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	private readonly userPermisos = inject(UserPermissionsService);
	// #endregion

	readonly canAccess = this.userPermisos.hasCapability(AYUDA_TICKET_MANAGE);
	readonly activeTab = signal<TicketAdminTab>('bandeja');

	constructor() {
		this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			const tab = params.get('tab');
			if (tab === 'bandeja' || tab === 'tipos') this.activeTab.set(tab);
		});
	}

	onTabChange(value: string | number | undefined): void {
		if (value === undefined) return;
		void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: String(value) } });
	}
}
