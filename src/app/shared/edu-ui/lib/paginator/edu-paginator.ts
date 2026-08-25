import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface EduPaginatorPageEvent {
	first: number;
	rows: number;
	page: number;
	pageCount: number;
}

const PAGE_WINDOW = 5;

@Component({
	selector: 'edu-paginator',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-paginator">
			@if (showCurrentPageReport()) {
				<span class="edu-paginator__report">{{ report() }}</span>
			}

			<button type="button" class="edu-paginator__nav" [disabled]="currentPage() === 0" (click)="goToPage(0)">
				<i class="pi pi-angle-double-left"></i>
			</button>
			<button type="button" class="edu-paginator__nav" [disabled]="currentPage() === 0" (click)="goToPage(currentPage() - 1)">
				<i class="pi pi-angle-left"></i>
			</button>

			@for (page of visiblePages(); track page) {
				<button
					type="button"
					class="edu-paginator__page"
					[class.edu-paginator__page--active]="page === currentPage()"
					(click)="goToPage(page)"
				>
					{{ page + 1 }}
				</button>
			}

			<button type="button" class="edu-paginator__nav" [disabled]="currentPage() >= pageCount() - 1" (click)="goToPage(currentPage() + 1)">
				<i class="pi pi-angle-right"></i>
			</button>
			<button type="button" class="edu-paginator__nav" [disabled]="currentPage() >= pageCount() - 1" (click)="goToPage(pageCount() - 1)">
				<i class="pi pi-angle-double-right"></i>
			</button>

			@if (rowsPerPageOptions()?.length) {
				<select class="edu-paginator__rows" [value]="rows()" (change)="onRowsChange($event)">
					@for (opt of rowsPerPageOptions(); track opt) {
						<option [value]="opt">{{ opt }}</option>
					}
				</select>
			}
		</div>
	`,
	styleUrl: './edu-paginator.scss',
})
export class EduPaginator {
	readonly rows = input(10);
	readonly first = input(0);
	readonly totalRecords = input(0);
	readonly rowsPerPageOptions = input<number[]>();
	readonly showCurrentPageReport = input(false);
	readonly currentPageReportTemplate = input('{first} - {last} de {totalRecords}');

	readonly onPageChange = output<EduPaginatorPageEvent>();

	protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalRecords() / this.rows())));
	protected readonly currentPage = computed(() => Math.min(Math.floor(this.first() / this.rows()), this.pageCount() - 1));

	protected readonly visiblePages = computed(() => {
		const count = this.pageCount();
		const current = this.currentPage();
		const half = Math.floor(PAGE_WINDOW / 2);
		let start = Math.max(0, current - half);
		const end = Math.min(count, start + PAGE_WINDOW);
		start = Math.max(0, end - PAGE_WINDOW);
		return Array.from({ length: end - start }, (_, i) => start + i);
	});

	protected readonly report = computed(() => {
		const total = this.totalRecords();
		const first = total === 0 ? 0 : this.first() + 1;
		const last = Math.min(this.first() + this.rows(), total);
		return this.currentPageReportTemplate()
			.replace('{first}', String(first))
			.replace('{last}', String(last))
			.replace('{totalRecords}', String(total))
			.replace('{currentPage}', String(this.currentPage() + 1))
			.replace('{totalPages}', String(this.pageCount()))
			.replace('{rows}', String(this.rows()));
	});

	protected goToPage(page: number): void {
		const clamped = Math.max(0, Math.min(page, this.pageCount() - 1));
		this.emit(clamped * this.rows(), this.rows());
	}

	protected onRowsChange(event: Event): void {
		const rows = Number((event.target as HTMLSelectElement).value);
		this.emit(0, rows);
	}

	private emit(first: number, rows: number): void {
		const pageCount = Math.max(1, Math.ceil(this.totalRecords() / rows));
		this.onPageChange.emit({ first, rows, page: first / rows, pageCount });
	}
}
