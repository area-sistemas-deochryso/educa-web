import { Component, inject, OnInit, DestroyRef, signal, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { VoiceButtonComponent } from '@shared/components/voice-button';
import { FloatingNotificationBellComponent } from '@shared/components/floating-notification-bell';
import {
	AuthService,
	UserPermisosService,
	SwService,
	SignalRService,
	ErrorHandlerService,
} from '@core/services';
import { logger } from '@core/helpers';
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
	private signalRService = inject(SignalRService);
	private errorHandler = inject(ErrorHandlerService);
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

		// Conectar SignalR para notificaciones en tiempo real
		this.setupSignalRNotifications();
	}

	/**
	 * Configura SignalR para recibir notificaciones de asistencia en tiempo real.
	 * Solo aplica para apoderados y estudiantes.
	 */
	private setupSignalRNotifications(): void {
		const user = this.authService.currentUser;
		const rolesConNotificaciones = ['Apoderado', 'Estudiante'];

		if (!user || !rolesConNotificaciones.includes(user.rol)) {
			return;
		}

		// Conectar al hub
		this.signalRService.connect();

		// Suscribirse a notificaciones de asistencia
		this.signalRService.notificacionAsistencia$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((notificacion) => {
				logger.log('[Layout] Notificación de asistencia recibida:', notificacion);

				// Mostrar toast con la notificación
				const icon = notificacion.tipoMarcacion === 'entrada' ? '🏫' : '🏠';
				this.errorHandler.showSuccess(
					`${icon} Asistencia registrada`,
					notificacion.mensaje,
					6000,
				);

				// Confirmar recepción al servidor
				this.signalRService.confirmarRecepcion(notificacion.id);
			});

		// Log de errores de conexión
		this.signalRService.connectionError$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((error) => {
				logger.warn('[Layout] Error de conexión SignalR:', error);
			});
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
		// Desconectar SignalR antes de cerrar sesión
		this.signalRService.disconnect();

		this.userPermisosService.clear();
		this.swService.clearCache();
		this.authService.logout();
		this.router.navigate(['/intranet/login']);
	}
}
