// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
// #endregion

// #region Implementation
/**
 * Pill reusable que muestra un CorrelationId como hipervínculo al hub
 * `/intranet/admin/correlation/:id`. Standalone, OnPush.
 *
 * Plan 32 Chat 4 — usado por los 4 dashboards admin (error-logs,
 * rate-limit-events, feedback-reports, email-outbox) y por el detail drawer
 * de cada uno. La pill encapsula la única forma admin de saltar al hub
 * cruzado, así no se duplica la lógica de navegación.
 *
 * Reglas:
 * - styleClass `tag-neutral` (design-system A1 Opción C: id es metadato
 *   informativo, no estado crítico).
 * - aria-label dinámico obligatorio (a11y.md — botón icon-only/text-only).
 * - Modo `compact` trunca a 8 chars + tooltip con id completo (uso en celdas
 *   estrechas de tablas).
 */
@Component({
	selector: 'app-correlation-id-pill',
	standalone: true,
	imports: [TagModule, TooltipModule],
	templateUrl: './correlation-id-pill.component.html',
	styleUrl: './correlation-id-pill.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationIdPillComponent {
	// #region Dependencias
	private readonly router = inject(Router);
	// #endregion

	// #region Inputs
	readonly id = input.required<string | null>();
	/** Trunca a 8 chars cuando true. El tooltip muestra el id completo. */
	readonly compact = input<boolean>(false);
	// #endregion

	// #region Computed
	readonly displayValue = computed(() => {
		const value = this.id();
		if (!value) return '—';
		if (!this.compact()) return value;
		return value.length > 8 ? value.slice(0, 8) + '…' : value;
	});

	readonly ariaLabel = computed(() => {
		const value = this.id();
		return value
			? `Ver eventos del correlation id ${value}`
			: 'Sin correlation id disponible';
	});

	readonly tooltip = computed(() => {
		const value = this.id();
		if (!value) return '';
		return this.compact() ? value : '';
	});

	readonly isClickable = computed(() => !!this.id());
	// #endregion

	// #region Event handlers
	onClick(event: MouseEvent): void {
		event.stopPropagation();
		const value = this.id();
		if (!value) return;
		void this.router.navigate(['/intranet/admin/correlation', value]);
	}
	// #endregion
}
// #endregion
