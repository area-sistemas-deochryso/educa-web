import { Directive, ElementRef, OnDestroy, Renderer2, computed, effect, inject, input } from '@angular/core';
import { EduTableService } from './edu-table.service';
import type { EduTableSortOrder } from './edu-table';

const ICON_BY_ORDER: Record<'asc' | 'desc' | 'none', string> = {
	asc: '▲',
	desc: '▼',
	none: '⇅',
};

/**
 * Sort trigger for an `edu-table` header cell — equivalent to PrimeNG's `pSortableColumn`.
 * Reads/writes sort state through the table's scoped `EduTableService` (same DI pattern as
 * edu-tabs/edu-tab), since the directive lives inside the consumer's projected header template.
 */
@Directive({
	selector: '[eduSortableColumn]',
	standalone: true,
	host: {
		tabindex: '0',
		'[attr.aria-sort]': 'ariaSort()',
		'[class.edu-sortable-column]': 'true',
		'[class.edu-sortable-column--active]': 'active()',
		'(click)': 'onActivate()',
		'(keydown.enter)': 'onActivate()',
		'(keydown.space)': 'onActivate($event)',
	},
})
export class EduSortableColumn implements OnDestroy {
	readonly eduSortableColumn = input.required<string>();

	private readonly service = inject(EduTableService);
	private readonly host = inject(ElementRef<HTMLElement>);
	private readonly renderer = inject(Renderer2);
	private iconEl: HTMLElement | null = null;

	protected readonly active = computed(() => this.service.sortField() === this.eduSortableColumn());
	protected readonly order = computed<EduTableSortOrder>(() => (this.active() ? this.service.sortOrder() : null));
	protected readonly ariaSort = computed(() => (this.order() === 'asc' ? 'ascending' : this.order() === 'desc' ? 'descending' : 'none'));

	constructor() {
		effect(() => this.renderIcon(this.order()));
	}

	protected onActivate(event?: KeyboardEvent): void {
		event?.preventDefault();
		this.service.toggle(this.eduSortableColumn());
	}

	ngOnDestroy(): void {
		if (this.iconEl) {
			this.renderer.removeChild(this.host.nativeElement, this.iconEl);
		}
	}

	private renderIcon(order: EduTableSortOrder): void {
		if (!this.iconEl) {
			this.iconEl = this.renderer.createElement('span') as HTMLElement;
			this.renderer.addClass(this.iconEl, 'edu-sortable-column__icon');
			this.renderer.setAttribute(this.iconEl, 'aria-hidden', 'true');
			this.renderer.appendChild(this.host.nativeElement, this.iconEl);
		}
		this.renderer.setProperty(this.iconEl, 'textContent', ICON_BY_ORDER[order === 'asc' ? 'asc' : order === 'desc' ? 'desc' : 'none']);
	}
}
