// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	ContentChild,
	TemplateRef,
	computed,
	effect,
	input,
	signal,
} from '@angular/core';

import { EduPaginator } from '@edu-ui';

// #endregion

// #region Implementation
@Component({
	selector: 'app-responsive-table',
	standalone: true,
	imports: [EduPaginator],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './responsive-table.component.html',
	styleUrl: './responsive-table.component.scss',
})
export class ResponsiveTableComponent {
	// #region Inputs
	/** Datos — mismo array pasado al p-table [value] */
	readonly value = input.required<unknown[]>();

	/** Filas por página (debe coincidir con p-table [rows]) */
	readonly rows = input(10);

	/** Habilitar paginador en vista cards */
	readonly paginator = input(true);

	/** Opciones de filas por página */
	readonly rowsPerPageOptions = input<number[]>([5, 10, 25]);

	/** Mensaje cuando no hay datos */
	readonly emptyMessage = input('No se encontraron resultados');

	/** Icono del empty state */
	readonly emptyIcon = input('pi pi-inbox');

	/** aria-label para la región de cards */
	readonly ariaLabel = input('Lista de registros');
	// #endregion

	// #region Template refs (content projection)
	// FIX-CANDIDATE-2: static: true — resuelve templates antes de change detection (OnPush)
	@ContentChild('desktopView', { read: TemplateRef, static: true }) desktopView?: TemplateRef<unknown>;
	@ContentChild('mobileCard', { read: TemplateRef, static: true }) mobileCard?: TemplateRef<unknown>;
	// #endregion

	// #region Paginación cards
	readonly cardFirst = signal(0);

	readonly paginatedItems = computed(() => {
		const items = this.value();
		if (!this.paginator() || items.length === 0) return items;
		const first = this.cardFirst();
		return items.slice(first, first + this.rows());
	});

	readonly totalRecords = computed(() => this.value().length);
	readonly isEmpty = computed(() => this.value().length === 0);
	// #endregion

	// #region Constructor
	constructor() {
		// Reset paginación cuando cambia data (filtros, búsqueda, etc.)
		effect(() => {
			this.value();
			this.cardFirst.set(0);
		});
	}
	// #endregion

	// #region Event handlers
	onCardPageChange(event: { first?: number; rows?: number }): void {
		this.cardFirst.set(event.first ?? 0);
	}
	// #endregion
}
// #endregion
