import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	TemplateRef,
	computed,
	contentChild,
	input,
	signal,
} from '@angular/core';

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
 * La paginación es local (corta `items`): no sirve para tablas paginadas por servidor.
 */
@Component({
	selector: 'app-mobile-card-list',
	standalone: true,
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './mobile-card-list.component.html',
	styleUrl: './mobile-card-list.component.scss',
})
export class MobileCardListComponent<T> {
	readonly items = input.required<readonly T[]>();
	readonly pageSize = input(5);

	protected readonly cardTemplate = contentChild.required(TemplateRef);

	private readonly requestedPage = signal(0);

	readonly pageCount = computed(() => Math.max(1, Math.ceil(this.items().length / this.pageSize())));

	/** Página efectiva (0-based): si la lista se acorta, no queda apuntando a una página que ya no existe. */
	readonly page = computed(() => Math.min(this.requestedPage(), this.pageCount() - 1));

	readonly pageItems = computed(() => {
		const size = this.pageSize();
		const start = this.page() * size;
		return this.items().slice(start, start + size);
	});

	previous(): void {
		this.requestedPage.set(Math.max(0, this.page() - 1));
	}

	next(): void {
		this.requestedPage.set(Math.min(this.pageCount() - 1, this.page() + 1));
	}
}
