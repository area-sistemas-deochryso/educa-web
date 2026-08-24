import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, computed, contentChild, contentChildren, effect, inject, input, output } from '@angular/core';
import { EduPaginator, EduPaginatorPageEvent } from '../paginator/edu-paginator';
import { EduTemplate } from './edu-template';
import { EduTableService } from './edu-table.service';

export type EduTableSortOrder = 'asc' | 'desc' | null;

export interface EduTableSortEvent {
	field: string;
	order: EduTableSortOrder;
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
	imports: [NgTemplateOutlet, EduPaginator],
	providers: [EduTableService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-table-wrapper" [class.edu-table-wrapper--scrollable]="scrollable()">
			<table class="edu-table">
				@if (headerTemplate(); as header) {
					<thead class="edu-table__thead">
						<ng-container [ngTemplateOutlet]="header"></ng-container>
					</thead>
				}
				<tbody class="edu-table__tbody">
					@if (bodyTemplate(); as body) {
						@for (row of value(); track trackByFn(row, $index); let index = $index) {
							<ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{ $implicit: row, index }"></ng-container>
						}
					}
				</tbody>
				@if (footerTemplate(); as footer) {
					<tfoot class="edu-table__tfoot">
						<ng-container [ngTemplateOutlet]="footer"></ng-container>
					</tfoot>
				}
			</table>
		</div>

		@if (paginator()) {
			<edu-paginator
				[rows]="rows()"
				[first]="first()"
				[totalRecords]="totalRecords()"
				[rowsPerPageOptions]="rowsPerPageOptions()"
				[showCurrentPageReport]="showCurrentPageReport()"
				[currentPageReportTemplate]="currentPageReportTemplate()"
				(onPageChange)="onPageChange.emit($event)"
			></edu-paginator>
		}
	`,
	styleUrl: './edu-table.scss',
})
export class EduTable<T = unknown> {
	readonly value = input<readonly T[]>([]);
	readonly scrollable = input(false);
	readonly trackBy = input<(row: T) => unknown>();

	readonly paginator = input(false);
	readonly rows = input(10);
	readonly first = input(0);
	readonly totalRecords = input(0);
	readonly rowsPerPageOptions = input<number[]>();
	readonly showCurrentPageReport = input(false);
	readonly currentPageReportTemplate = input('{first} - {last} de {totalRecords}');
	readonly onPageChange = output<EduPaginatorPageEvent>();

	readonly sortField = input<string | null>(null);
	readonly sortOrder = input<EduTableSortOrder>(null);
	readonly sortChange = output<EduTableSortEvent>();

	private readonly service = inject(EduTableService);

	private readonly headerRef = contentChild<TemplateRef<unknown>>('header');
	private readonly bodyRef = contentChild<TemplateRef<unknown>>('body');
	private readonly footerRef = contentChild<TemplateRef<unknown>>('footer');
	private readonly legacyTemplates = contentChildren(EduTemplate);

	protected readonly headerTemplate = computed(() => this.headerRef() ?? this.legacyTemplate('header'));
	protected readonly bodyTemplate = computed(() => this.bodyRef() ?? this.legacyTemplate('body'));
	protected readonly footerTemplate = computed(() => this.footerRef() ?? this.legacyTemplate('footer'));

	constructor() {
		effect(() => {
			this.service.sortField.set(this.sortField());
			this.service.sortOrder.set(this.sortOrder());
		});
		this.service.sortChange.subscribe((event) => this.sortChange.emit(event));
	}

	protected trackByFn = (row: T, index: number): unknown => this.trackBy()?.(row) ?? index;

	private legacyTemplate(name: string): TemplateRef<unknown> | undefined {
		return this.legacyTemplates().find((template) => template.pTemplate() === name)?.templateRef;
	}
}
