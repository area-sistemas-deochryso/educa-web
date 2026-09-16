import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LevelPageComponent } from './level-page.component';
import { LevelPageData } from '../level-page-data';

const DATA: LevelPageData = {
	level: 'inicial',
	title: 'Nivel Inicial',
	breadcrumbLabel: 'Inicial',
	blocks: [
		{ textBlockClass: 'custom-text-block', imageFirst: false, heading: 'H1', body: 'B1' },
		{ textBlockClass: 'custom-text-block-2', imageFirst: true, heading: 'H2', body: 'B2' },
		{ textBlockClass: 'custom-text-block', imageFirst: false, heading: 'H3', body: 'B3' },
	],
};

describe('LevelPageComponent', () => {
	let component: LevelPageComponent;
	let fixture: ComponentFixture<LevelPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LevelPageComponent],
			providers: [provideRouter([])],
		}).compileComponents();

		fixture = TestBed.createComponent(LevelPageComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('data', DATA);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render the level title and breadcrumb from data', () => {
		const el: HTMLElement = fixture.nativeElement;
		expect(el.querySelector('h1')?.textContent).toContain('Nivel Inicial');
		expect(el.querySelector('.breadcrumb-item.active')?.textContent).toContain('Inicial');
	});

	it('should render one section per block, in the given image/text order', () => {
		const el: HTMLElement = fixture.nativeElement;
		const sections = el.querySelectorAll('section.contador');
		expect(sections.length).toBe(3);

		const firstBlockFirstCol = sections[0].querySelector('.row > div:first-child');
		expect(firstBlockFirstCol?.querySelector('.custom-text-block')).toBeTruthy();

		const secondBlockFirstCol = sections[1].querySelector('.row > div:first-child');
		expect(secondBlockFirstCol?.querySelector('.video-thumb')).toBeTruthy();
	});
});
