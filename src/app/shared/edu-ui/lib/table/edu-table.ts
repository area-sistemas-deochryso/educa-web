import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	TemplateRef,
	afterRenderEffect,
	computed,
	contentChild,
	contentChildren,
	effect,
	linkedSignal,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { EduPaginator, EduPaginatorPageEvent } from '../paginator/edu-paginator';
import { EduTemplate } from './edu-template';
import { EduTableService } from './edu-table.service';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';
import { EduSpinner } from '../spinner/edu-spinner';
import {
	DisplayRow,
	LeavingRow,
	MAX_ANIMATED_REMOVALS,
	cellTexts,
	flashChangedRow,
	hasChanged,
	playRowExit,
} from './edu-table-row-motion';

export type EduTableSortOrder = 'asc' | 'desc' | null;

export interface EduTableSortEvent {
	field: string;
	order: EduTableSortOrder;
}

export interface EduTableLazyLoadEvent {
	first: number;
	rows: number;
	sortField?: string | null;
	sortOrder?: EduTableSortOrder;
}

/** PrimeNG-style numeric sort order, accepted on the `sortOrder` input for migration parity. */
type EduTableSortOrderInput = EduTableSortOrder | -1 | 0 | 1;

function normalizeSortOrder(value: EduTableSortOrderInput): EduTableSortOrder {
	if (value === 1) return 'asc';
	if (value === -1) return 'desc';
	if (value === 0) return null;
	return value;
}

/**
 * Semantic `<table>` (not CdkTable's column-def API — real usage projects a full `<tr>` per
 * header/body/footer, not per-column cells, which CdkTable's model doesn't support without
 * rewriting every call site). Sort state and dual template syntax (`#name` / `pTemplate="name"`)
 * are edu-table's own contract; paginator is reused as-is (edu-paginator, brief 581).
 */
@Component({
	selector: 'edu-table',
	standalone: true,
	imports: [NgTemplateOutlet, EduPaginator, EduSpinner, EduPtRoot],
	providers: [EduTableService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div
			class="edu-table-wrapper"
			[class.edu-table-wrapper--scrollable]="scrollable()"
			[class]="styleClass()"
			[eduPtRoot]="$safeNavigationMigration(pt()?.root)"
		>
			<table
				class="edu-table"
				[class.edu-table--row-hover]="rowHover()"
				[style]="tableStyle()"
			>
				@if (captionTemplate(); as caption) {
					<caption class="edu-table__caption">
						<ng-container [ngTemplateOutlet]="caption"></ng-container>
					</caption>
				}
				@if (headerTemplate(); as header) {
					<thead class="edu-table__thead">
						<ng-container [ngTemplateOutlet]="header"></ng-container>
					</thead>
				}
				<tbody class="edu-table__tbody" #tbody>
					@if (bodyTemplate(); as body) {
						@for (item of displayRows(); track item.key; let index = $index) {
							<ng-container
								[ngTemplateOutlet]="body"
								[ngTemplateOutletContext]="{ $implicit: item.row, rowIndex: index }"
							></ng-container>
						}
					}
					@if (value().length === 0 && emptyTemplate(); as empty) {
						<ng-container [ngTemplateOutlet]="empty"></ng-container>
					}
				</tbody>
				@if (footerTemplate(); as footer) {
					<tfoot class="edu-table__tfoot">
						<ng-container [ngTemplateOutlet]="footer"></ng-container>
					</tfoot>
				}
			</table>

			@if (loading()) {
				<div class="edu-table__loading-overlay">
					<edu-spinner></edu-spinner>
				</div>
			}
		</div>

		@if (paginator()) {
			<edu-paginator
				[rows]="rows()"
				[first]="first()"
				[totalRecords]="totalRecords()"
				[rowsPerPageOptions]="rowsPerPageOptions()"
				[showCurrentPageReport]="showCurrentPageReport()"
				[currentPageReportTemplate]="currentPageReportTemplate()"
				(onPageChange)="handlePageChange($event)"
			></edu-paginator>
		}
	`,
	styleUrl: './edu-table.scss',
})
export class EduTable<T = unknown> {
	readonly value = input<readonly T[]>([]);
	readonly scrollable = input(false);
	readonly trackBy = input<(row: T) => unknown>();
	/** Field name used as row identity when `trackBy` isn't set — declarative equivalent of `trackBy`, same purpose PrimeNG's `dataKey` serves. */
	readonly dataKey = input<string>();
	readonly loading = input(false);
	readonly tableStyle = input<Record<string, string> | null>(null);
	/** Accepted for template-binding parity with real usage — edu-table never slices `value()` locally (the paginator only emits page events), so it's already server-driven and this flag doesn't change rendering. */
	readonly lazy = input(false);
	readonly rowHover = input(true);
	readonly styleClass = input('');
	readonly pt = input<EduPassThrough>();

	readonly paginator = input(false);
	readonly rows = input(10);
	readonly first = input(0);
	readonly totalRecords = input(0);
	readonly rowsPerPageOptions = input<number[]>();
	readonly showCurrentPageReport = input(false);
	readonly currentPageReportTemplate = input('{first} - {last} de {totalRecords}');
	readonly onPageChange = output<EduPaginatorPageEvent>();
	readonly onLazyLoad = output<EduTableLazyLoadEvent>();

	readonly sortField = input<string | null>(null);
	/** Accepts edu-table's own `'asc'|'desc'|null` or PrimeNG's numeric `-1|0|1` (normalized internally). */
	readonly sortOrder = input<EduTableSortOrderInput>(null);
	readonly sortChange = output<EduTableSortEvent>();

	private readonly service = inject(EduTableService);

	private readonly headerRef = contentChild<TemplateRef<unknown>>('header');
	private readonly bodyRef = contentChild<TemplateRef<unknown>>('body');
	private readonly footerRef = contentChild<TemplateRef<unknown>>('footer');
	private readonly emptyRef = contentChild<TemplateRef<unknown>>('emptymessage');
	private readonly captionRef = contentChild<TemplateRef<unknown>>('caption');
	private readonly legacyTemplates = contentChildren(EduTemplate);

	protected readonly headerTemplate = computed(
		() => this.headerRef() ?? this.legacyTemplate('header'),
	);
	protected readonly bodyTemplate = computed(() => this.bodyRef() ?? this.legacyTemplate('body'));
	protected readonly footerTemplate = computed(
		() => this.footerRef() ?? this.legacyTemplate('footer'),
	);
	protected readonly emptyTemplate = computed(
		() => this.emptyRef() ?? this.legacyTemplate('emptymessage'),
	);
	protected readonly captionTemplate = computed(
		() => this.captionRef() ?? this.legacyTemplate('caption'),
	);

	private readonly tbody = viewChild<ElementRef<HTMLTableSectionElement>>('tbody');

	/** Filas quitadas que siguen en el DOM mientras corre su salida. */
	private readonly leaving = linkedSignal<readonly T[], LeavingRow<T>[]>({
		source: this.value,
		computation: (rows, previous) => this.detectRemovals(rows, previous?.source ?? [], previous?.value ?? []),
	});
	private readonly cellSnapshots = new Map<unknown, string[]>();
	private readonly exiting = new Set<unknown>();

	/** Con identidad de fila real (`trackBy`/`dataKey`) se animan cambios y bajas; sin ella, la tabla se ve igual que siempre. */
	private readonly motionEnabled = computed(() => !!this.trackBy() || !!this.dataKey());

	protected readonly displayRows = computed<DisplayRow<T>[]>(() => {
		const rows = this.value().map((row, i) => ({ row, key: this.trackByFn(row, i), leaving: false }));
		for (const gone of this.leaving()) {
			rows.splice(Math.min(gone.index, rows.length), 0, { row: gone.row, key: gone.key, leaving: true });
		}
		return rows;
	});

	private readonly normalizedSortOrder = computed(() => normalizeSortOrder(this.sortOrder()));

	constructor() {
		effect(() => {
			this.service.sortField.set(this.sortField());
			this.service.sortOrder.set(this.normalizedSortOrder());
		});
		afterRenderEffect(() => this.runRowMotion(this.displayRows()));
		this.service.sortChange.subscribe((event) => {
			this.sortChange.emit(event);
			this.onLazyLoad.emit({
				first: this.first(),
				rows: this.rows(),
				sortField: event.field,
				sortOrder: event.order,
			});
		});
	}

	protected handlePageChange(event: EduPaginatorPageEvent): void {
		this.onPageChange.emit(event);
		this.onLazyLoad.emit({
			first: event.first,
			rows: event.rows,
			sortField: this.sortField(),
			sortOrder: this.normalizedSortOrder(),
		});
	}

	/** Baja puntual = el conjunto nuevo es subconjunto del anterior y faltan pocas filas; paginar o filtrar no entra. */
	private detectRemovals(
		rows: readonly T[],
		previous: readonly T[],
		current: readonly LeavingRow<T>[],
	): LeavingRow<T>[] {
		if (!this.motionEnabled() || this.loading()) return [];
		const nextKeys = new Set(rows.map((row, i) => this.trackByFn(row, i)));
		const gone = previous
			.map((row, index) => ({ row, index, key: this.trackByFn(row, index) }))
			.filter((entry) => !nextKeys.has(entry.key));
		const isSubset = previous.length - gone.length === rows.length;
		const still = current.filter((entry) => !nextKeys.has(entry.key));
		if (!isSubset || gone.length === 0 || gone.length > MAX_ANIMATED_REMOVALS) return still;
		return [...still, ...gone.filter((g) => !still.some((s) => s.key === g.key))];
	}

	private runRowMotion(rows: readonly DisplayRow<T>[]): void {
		const body = this.tbody()?.nativeElement;
		if (!body || !this.motionEnabled()) return;
		const trs = body.children;
		if (trs.length !== rows.length) return;

		const seen = new Set<unknown>();
		const changed: { tr: Element; previous: string[]; current: string[] }[] = [];
		rows.forEach((item, i) => {
			const tr = trs[i];
			seen.add(item.key);
			if (item.leaving) return this.startExit(tr as HTMLElement, item.key);
			const current = cellTexts(tr);
			const previous = this.cellSnapshots.get(item.key);
			if (hasChanged(previous, current)) changed.push({ tr, previous: previous!, current });
			this.cellSnapshots.set(item.key, current);
		});
		for (const key of this.cellSnapshots.keys()) if (!seen.has(key)) this.cellSnapshots.delete(key);

		// Cambio masivo (orden con columna de índice, recarga con datos nuevos): no se destella.
		if (changed.length * 2 > rows.length) return;
		for (const { tr, previous, current } of changed) flashChangedRow(tr, previous, current);
	}

	private startExit(tr: HTMLElement, key: unknown): void {
		if (this.exiting.has(key)) return;
		this.exiting.add(key);
		playRowExit(tr, () => {
			this.exiting.delete(key);
			this.leaving.update((list) => list.filter((entry) => entry.key !== key));
		});
	}

	protected trackByFn = (row: T, index: number): unknown => {
		const trackBy = this.trackBy();
		if (trackBy) return trackBy(row);

		const dataKey = this.dataKey();
		if (dataKey && row && typeof row === 'object')
			return (row as Record<string, unknown>)[dataKey];

		return index;
	};

	private legacyTemplate(name: string): TemplateRef<unknown> | undefined {
		return this.legacyTemplates().find((template) => template.pTemplate() === name)
			?.templateRef;
	}
}
