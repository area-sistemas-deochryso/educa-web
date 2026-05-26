import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { StatsSkeletonComponent } from './stats-skeleton.component';

describe('StatsSkeletonComponent', () => {
	let fixture: ComponentFixture<StatsSkeletonComponent>;
	let el: HTMLElement;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [StatsSkeletonComponent],
		});
		fixture = TestBed.createComponent(StatsSkeletonComponent);
		el = fixture.nativeElement as HTMLElement;
	});

	it('creates', () => {
		fixture.detectChanges();
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('renders 4 cards by default', () => {
		fixture.detectChanges();
		const cards = el.querySelectorAll('.stat-card');
		expect(cards.length).toBe(4);
	});

	it('renders custom card count', () => {
		fixture.componentRef.setInput('count', 2);
		fixture.detectChanges();
		const cards = el.querySelectorAll('.stat-card');
		expect(cards.length).toBe(2);
	});

	it('defaults icon position to left (no right class)', () => {
		fixture.detectChanges();
		const card = el.querySelector('.stat-card');
		expect(card?.classList.contains('stat-card--icon-right')).toBe(false);
	});

	it('applies icon-right class when position is right', () => {
		fixture.componentRef.setInput('iconPosition', 'right');
		fixture.detectChanges();
		const card = el.querySelector('.stat-card');
		expect(card?.classList.contains('stat-card--icon-right')).toBe(true);
	});

	it('hides description skeleton by default', () => {
		fixture.detectChanges();
		const loaders = el.querySelectorAll('app-skeleton-loader');
		// icon (circle) + title + value = 3 per card, no description
		const perCard = loaders.length / 4;
		expect(perCard).toBe(3);
	});

	it('shows description skeleton when enabled', () => {
		fixture.componentRef.setInput('showDescription', true);
		fixture.detectChanges();
		const loaders = el.querySelectorAll('app-skeleton-loader');
		// icon + title + value + description = 4 per card
		const perCard = loaders.length / 4;
		expect(perCard).toBe(4);
	});

	it('applies custom minColumnWidth to grid', () => {
		fixture.componentRef.setInput('minColumnWidth', '300px');
		fixture.detectChanges();
		const section = el.querySelector('.stats-section') as HTMLElement;
		expect(section.style.gridTemplateColumns).toContain('300px');
	});
});
