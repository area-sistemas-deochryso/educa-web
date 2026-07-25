import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder de la sección Ticket — implementación completa en F5
 * (`xrepo-panel-ayuda-intranet`). El shell (`AyudaShellComponent`) no necesita
 * cambios cuando F5 reemplace este componente por el real: solo se actualiza
 * el `loadComponent` de la ruta `ticket` en `ayuda.routes.ts`.
 */
@Component({
	selector: 'app-ayuda-ticket-placeholder',
	standalone: true,
	template: `
		<div class="ayuda-placeholder">
			<i class="pi pi-ticket"></i>
			<h3>Generar ticket</h3>
			<p>Esta sección estará disponible próximamente.</p>
		</div>
	`,
	styleUrl: './ayuda-ticket-placeholder.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaTicketPlaceholderComponent {}
