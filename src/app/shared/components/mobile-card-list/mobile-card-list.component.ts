import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	OnInit,
	TemplateRef,
	computed,
	contentChild,
	effect,
	input,
	untracked,
} from '@angular/core';

import { ClientPaging, createClientPaging } from '@shared/utils/client-paging.utils';

/**
 * Lista de cards con paginación compacta (anterior / siguiente + «1 de N»), pensada para reemplazar una
 * tabla en pantallas angostas. La card se define con un `<ng-template let-item>` hijo:
 *
 * ```html
 * <app-mobile-card-list [items]="tickets()">
 *   <ng-template let-ticket>
 *     <app-card-row label="Tipo">{{ ticket.tipo }}</app-card-row>
 *     <app-card-actions><button aria-label="Ver">…</button></app-card-actions>
 *   </ng-template>
 * </app-mobile-card-list>
 * ```
 *
 * Dos modos de paginación (ambos del lado del cliente):
 * - **Local**: se pasa `[items]` con la lista completa y el componente la corta por página.
 * - **Compartido**: se pasa `[paging]` con el `ClientPaging` de la tabla de escritorio, así que tabla y
 *   cards comparten la página actual. El tamaño de página pasa a `pageSize` mientras las cards están
 *   montadas y se restaura al desmontarlas.
 */
@Component({
	selector: 'app-mobile-card-list',
	standalone: true,
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './mobile-card-list.component.html',
	styleUrl: './mobile-card-list.component.scss',
})
export class MobileCardListComponent<T> implements OnInit, OnDestroy {
	readonly items = input<readonly T[]>([]);
	readonly paging = input<ClientPaging<T> | null>(null);
	readonly pageSize = input(5);

	protected readonly cardTemplate = contentChild.required(TemplateRef);

	private readonly local = createClientPaging<T>(computed(() => this.items()), 5);
	private readonly active = computed(() => this.paging() ?? this.local);
	private rowsToRestore: number | null = null;

	private readonly rows = computed(() => this.active().rows());
	private readonly total = computed(() => this.active().totalRecords());

	readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.rows())));
	readonly page = computed(() =>
		Math.min(Math.floor(this.active().first() / this.rows()), this.pageCount() - 1),
	);
	readonly pageItems = computed(() => this.active().value());

	/** Si la lista se acorta (p. ej. por un filtro), no queda apuntando a una página que ya no existe. */
	private readonly clampPage = effect(() => {
		const total = this.total();
		const rows = this.rows();
		if (total > 0 && this.active().first() >= total) {
			untracked(() => this.goTo(Math.ceil(total / rows) - 1));
		}
	});

	ngOnInit(): void {
		const wanted = this.pageSize();
		const current = this.rows();
		if (wanted === current) return;
		if (this.paging()) this.rowsToRestore = current;
		this.setRows(wanted);
	}

	ngOnDestroy(): void {
		if (this.rowsToRestore !== null) this.setRows(this.rowsToRestore);
	}

	previous(): void {
		this.goTo(this.page() - 1);
	}

	next(): void {
		this.goTo(this.page() + 1);
	}

	private goTo(page: number): void {
		const rows = this.rows();
		const target = Math.min(Math.max(0, page), this.pageCount() - 1);
		this.active().onPageChange({ first: target * rows, rows, page: target, pageCount: this.pageCount() });
	}

	private setRows(rows: number): void {
		const pageCount = Math.max(1, Math.ceil(this.total() / rows));
		this.active().onPageChange({ first: 0, rows, page: 0, pageCount });
	}
}
