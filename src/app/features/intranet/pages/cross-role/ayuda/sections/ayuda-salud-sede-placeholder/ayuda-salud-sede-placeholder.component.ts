import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder de la sección Salud de sede — implementación completa en F6
 * (`xrepo-panel-ayuda-intranet`). Ver nota de desacople en
 * `AyudaTicketPlaceholderComponent`.
 */
@Component({
	selector: 'app-ayuda-salud-sede-placeholder',
	standalone: true,
	template: `
		<div class="ayuda-placeholder">
			<i class="pi pi-heart"></i>
			<h3>Salud de sede</h3>
			<p>Esta sección estará disponible próximamente.</p>
		</div>
	`,
	styleUrl: './ayuda-salud-sede-placeholder.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaSaludSedePlaceholderComponent {}
