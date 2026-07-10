import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import type { ModoAsignacion } from '@data/models';
import {
	getModoAsignacionLabel,
	getModoAsignacionSeverity,
	getModoAsignacionTooltip,
} from './modo-asignacion.glossary';

// #region Implementation
/**
 * Badge + tooltip compartido para el modo de asignación de un salón
 * ("Tutor pleno" / "Por curso" / "Flexible").
 *
 * Centraliza texto/comportamiento antes duplicado en salones-admin-table,
 * salon-detail-dialog, horario-detail-drawer y usuario-form-dialog (P84 F4).
 */
@Component({
	selector: 'app-modo-asignacion-badge',
	standalone: true,
	imports: [TagModule, TooltipModule],
	template: `
		@if (label(); as label) {
			<p-tag [value]="label" styleClass="tag-neutral" [pTooltip]="tooltip()" tooltipPosition="top" />
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModoAsignacionBadgeComponent {
	readonly modo = input.required<ModoAsignacion | null>();

	readonly label = computed(() => {
		const modo = this.modo();
		return modo ? getModoAsignacionLabel(modo) : null;
	});

	readonly tooltip = computed(() => {
		const modo = this.modo();
		return modo ? getModoAsignacionTooltip(modo) : '';
	});

	readonly severity = computed(() => {
		const modo = this.modo();
		return modo ? getModoAsignacionSeverity(modo) : 'secondary';
	});
}
// #endregion
