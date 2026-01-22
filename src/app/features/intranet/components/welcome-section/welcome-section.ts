import { Component, input } from '@angular/core';

@Component({
	selector: 'app-welcome-section',
	imports: [],
	templateUrl: './welcome-section.html',
	styleUrl: './welcome-section.scss',
})
export class WelcomeSection {
	/** Icono de PrimeNG a mostrar */
	icon = input<string>('pi-graduation-cap');

	/** Título de bienvenida */
	title = input<string>('Bienvenido a tu Intranet');

	/** Subtítulo descriptivo */
	subtitle = input<string>('Aquí encontrarás toda la información relevante para tu día a día académico.');
}
