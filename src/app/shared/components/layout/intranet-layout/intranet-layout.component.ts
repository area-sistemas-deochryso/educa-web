import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { VoiceButtonComponent } from '@shared/components/voice-button';
import { FloatingNotificationBellComponent } from '@shared/components/floating-notification-bell';
import { AuthService } from '@core/services';
import { NavItemComponent, LogoutButtonComponent, MobileMenuComponent, NavMenuItem } from './components';

@Component({
	selector: 'app-intranet-layout',
	imports: [
		RouterOutlet,
		RouterLink,
		VoiceButtonComponent,
		FloatingNotificationBellComponent,
		NavItemComponent,
		LogoutButtonComponent,
		MobileMenuComponent,
	],
	templateUrl: './intranet-layout.component.html',
	styleUrl: './intranet-layout.component.scss',
})
export class IntranetLayoutComponent {
	private authService = inject(AuthService);
	private router = inject(Router);

	readonly navItems: NavMenuItem[] = [
		{ route: '/intranet', label: 'Inicio', icon: 'pi pi-home', exact: true },
		{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi pi-check-square' },
		{ route: '/intranet/horarios', label: 'Horarios', icon: 'pi pi-clock' },
		{ route: '/intranet/Calendario', label: 'Calendario', icon: 'pi pi-calendar' },
	];

	logout(): void {
		this.authService.logout();
		this.router.navigate(['/intranet/login']);
	}
}
