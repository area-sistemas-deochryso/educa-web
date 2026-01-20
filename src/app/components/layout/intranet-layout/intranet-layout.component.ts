import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { VoiceButtonComponent } from '../../shared/voice-button';
import { FloatingNotificationBellComponent } from '../../shared/floating-notification-bell';

@Component({
	selector: 'app-intranet-layout',
	imports: [RouterOutlet, RouterLink, RouterLinkActive, VoiceButtonComponent, FloatingNotificationBellComponent],
	templateUrl: './intranet-layout.component.html',
	styleUrl: './intranet-layout.component.scss',
})
export class IntranetLayoutComponent {}
