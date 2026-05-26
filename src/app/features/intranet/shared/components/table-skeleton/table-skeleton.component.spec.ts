import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SkeletonColumnDef } from './table-skeleton.types';
import { TableSkeletonComponent } from './table-skeleton.component';

const COLUMNS: SkeletonColumnDef[] = [
	{ width: '200px', cellType: 'text' },
	{ width: 'flex', cellType: 'badge' },
	{ width: '120px', cellType: 'actions' },
];

describe('TableSkeletonComponent', () => {
	let fixture: ComponentFixture<TableSkeletonComponent>;
	let el: HTMLElement;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [TableSkeletonComponent],
		});
		fixture = TestBed.createComponent(TableSkeletonComponent);
		fixture.componentRef.setInput('columns', COLUMNS);
		el = fixture.nativeElement as HTMLElement;
	});

	it('creates', () => {
		fixture.detectChanges();
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('renders default 10 rows', () => {
		fixture.detectChanges();
		const rows = el.querySelectorAll('.table-skeleton__row');
		expect(rows.length).toBe(10);
	});

	it('renders custom row count', () => {
		fixture.componentRef.setInput('rows', 3);
		fixture.detectChanges();
		const rows = el.querySelectorAll('.table-skeleton__row');
		expect(rows.length).toBe(3);
	});

	it('shows header by default', () => {
		fixture.detectChanges();
		expect(el.querySelector('.table-skeleton__header')).not.toBeNull();
	});

	it('hides header when showHeader is false', () => {
		fixture.componentRef.setInput('showHeader', false);
		fixture.detectChanges();
		expect(el.querySelector('.table-skeleton__header')).toBeNull();
	});

	it('renders correct number of columns per row', () => {
		fixture.detectChanges();
		const firstRow = el.querySelector('.table-skeleton__row');
		const cells = firstRow?.querySelectorAll('.row-cell');
		expect(cells?.length).toBe(COLUMNS.length);
	});

	it('applies minHeight style', () => {
		fixture.componentRef.setInput('minHeight', '600px');
		fixture.detectChanges();
		const container = el.querySelector('.table-skeleton') as HTMLElement;
		expect(container.style.minHeight).toBe('600px');
	});

	it('renders avatar-text cell type with circle and text skeletons', () => {
		const avatarColumns: SkeletonColumnDef[] = [{ width: 'flex', cellType: 'avatar-text' }];
		fixture.componentRef.setInput('columns', avatarColumns);
		fixture.componentRef.setInput('rows', 1);
		fixture.detectChanges();
		const cell = el.querySelector('.row-cell');
		expect(cell?.querySelector('.cell-avatar')).not.toBeNull();
	});

	it('renders text-subtitle cell type with stacked skeletons', () => {
		const cols: SkeletonColumnDef[] = [{ width: 'flex', cellType: 'text-subtitle' }];
		fixture.componentRef.setInput('columns', cols);
		fixture.componentRef.setInput('rows', 1);
		fixture.detectChanges();
		const cell = el.querySelector('.row-cell');
		expect(cell?.querySelector('.cell-stack')).not.toBeNull();
	});

	it('renders actions cell type with multiple circle skeletons', () => {
		const cols: SkeletonColumnDef[] = [{ width: '120px', cellType: 'actions' }];
		fixture.componentRef.setInput('columns', cols);
		fixture.componentRef.setInput('rows', 1);
		fixture.detectChanges();
		const cell = el.querySelector('.cell-actions');
		const circles = cell?.querySelectorAll('app-skeleton-loader');
		expect(circles?.length).toBe(3);
	});
});
