import { Component, inject, OnInit, DestroyRef, signal, effect } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { VoiceButtonComponent } from '@shared/components/voice-button';
import { FloatingNotificationBellComponent } from '@shared/components/floating-notification-bell';
import { AuthService, UserPermisosService, SwService } from '@core/services';
import {
	NavItemComponent,
	UserProfileMenuComponent,
	MobileMenuComponent,
	NavMenuItem,
} from './components';
import { INTRANET_MENU, NavItemWithPermiso } from './intranet-menu.config';

@Component({
	selector: 'app-intranet-layout',
	imports: [
		RouterOutlet,
		RouterLink,
		VoiceButtonComponent,
		FloatingNotificationBellComponent,
		NavItemComponent,
		UserProfileMenuComponent,
		MobileMenuComponent,
	],
	templateUrl: './intranet-layout.component.html',
	styleUrl: './intranet-layout.component.scss',
})
export class IntranetLayoutComponent implements OnInit {
	private authService = inject(AuthService);
	private userPermisosService = inject(UserPermisosService);
	private swService = inject(SwService);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);

	private readonly _navItems = signal<NavMenuItem[]>([]);
	readonly navItems = this._navItems.asReadonly();

	constructor() {
		effect(() => {
			const loaded = this.userPermisosService.loaded();
			const vistasPermitidas = this.userPermisosService.vistasPermitidas();

			if (loaded) {
				this.updateNavItems(vistasPermitidas);
			}
		});
	}

	ngOnInit(): void {
		if (!this.userPermisosService.loaded()) {
			this.userPermisosService.loadPermisos(this.destroyRef);
		} else {
			this.updateNavItems(this.userPermisosService.vistasPermitidas());
		}
	}

	private updateNavItems(vistasPermitidas: string[]): void {
		if (vistasPermitidas.length === 0) {
			this._navItems.set(INTRANET_MENU as NavMenuItem[]);
			return;
		}

		const filteredItems = this.filterMenuByPermisos(INTRANET_MENU, vistasPermitidas);
		this._navItems.set(filteredItems);
	}

	private filterMenuByPermisos(
		items: NavItemWithPermiso[],
		vistasPermitidas: string[],
	): NavMenuItem[] {
		const result: NavMenuItem[] = [];

		for (const item of items) {
			if (item.children && item.children.length > 0) {
				const filteredChildren = this.filterMenuByPermisos(item.children, vistasPermitidas);

				if (filteredChildren.length > 0) {
					result.push({
						route: item.route,
						label: item.label,
						icon: item.icon,
						exact: item.exact,
						children: filteredChildren,
					});
				}
			} else if (item.permiso) {
				if (this.tienePermisoParaRuta(item.permiso, vistasPermitidas)) {
					result.push({
						route: item.route,
						label: item.label,
						icon: item.icon,
						exact: item.exact,
					});
				}
			}
		}

		return result;
	}

	private tienePermisoParaRuta(ruta: string, vistasPermitidas: string[]): boolean {
		const rutaNormalizada = (ruta.startsWith('/') ? ruta.substring(1) : ruta).toLowerCase();
		return vistasPermitidas.some((vista) => {
			const vistaNormalizada = (
				vista.startsWith('/') ? vista.substring(1) : vista
			).toLowerCase();
			return rutaNormalizada === vistaNormalizada;
		});
	}

	logout(): void {
		this.userPermisosService.clear();
		this.swService.clearCache();
		this.authService.logout();
		this.router.navigate(['/intranet/login']);
	}
}
