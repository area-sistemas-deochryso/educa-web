import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { VoiceButtonComponent } from '../../shared/voice-button';
import { FloatingNotificationBellComponent } from '../../shared/floating-notification-bell';
import { AuthService } from '../../../services';

@Component({
	selector: 'app-intranet-layout',
	imports: [
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		VoiceButtonComponent,
		FloatingNotificationBellComponent,
	],
	templateUrl: './intranet-layout.component.html',
	styleUrl: './intranet-layout.component.scss',
})
export class IntranetLayoutComponent {
	private authService = inject(AuthService);
	private router = inject(Router);

	logout(): void {
		this.authService.logout();
		this.router.navigate(['/intranet/login']);
	}
}
