import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-quick-access-card',
	imports: [RouterLink],
	templateUrl: './quick-access-card.html',
	styleUrl: './quick-access-card.scss',
})
export class QuickAccessCardComponent {
	/** Texto visible en la tarjeta */
	label = input.required<string>();

	/** Ruta de redirección */
	path = input.required<string>();

	/** Modal a abrir en la página destino (opcional) */
	modal = input<string>();

	/** Icono de PrimeNG a mostrar */
	icon = input<string>('pi-link');

	get queryParams(): Record<string, string> | null {
		const modalValue = this.modal();
		return modalValue ? { modal: modalValue } : null;
	}
}
