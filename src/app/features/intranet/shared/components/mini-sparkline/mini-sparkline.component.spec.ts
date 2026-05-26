import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { MiniSparklineComponent } from './mini-sparkline.component';

describe('MiniSparklineComponent', () => {
	let fixture: ComponentFixture<MiniSparklineComponent>;
	let component: MiniSparklineComponent;
	let componentRef: ComponentRef<MiniSparklineComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MiniSparklineComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(MiniSparklineComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('renders a path with 30 points', () => {
		const series = Array.from({ length: 30 }, (_, i) => i);
		componentRef.setInput('data', series);
		fixture.detectChanges();

		const geometry = component.path();
		expect(geometry).not.toBeNull();
		expect(geometry!.d.startsWith('M ')).toBe(true);
		// 30 puntos = 1 segmento M + 29 separadores ' L ' → split en 30 chunks
		expect(geometry!.d.split(' L ').length).toBe(30);

		const svg = fixture.nativeElement.querySelector('svg.mini-sparkline');
		expect(svg).toBeTruthy();
		expect(svg.getAttribute('role')).toBe('img');
	});

	it('renders the empty placeholder when data is []', () => {
		componentRef.setInput('data', []);
		fixture.detectChanges();

		expect(component.hasData()).toBe(false);
		const empty = fixture.nativeElement.querySelector('.mini-sparkline__empty');
		expect(empty).toBeTruthy();
		expect(empty.textContent.trim()).toBe('sin actividad');
		const svg = fixture.nativeElement.querySelector('svg');
		expect(svg).toBeNull();
	});

	it('renders the empty placeholder when every value is 0', () => {
		componentRef.setInput('data', [0, 0, 0, 0]);
		fixture.detectChanges();

		expect(component.hasData()).toBe(false);
		expect(fixture.nativeElement.querySelector('.mini-sparkline__empty')).toBeTruthy();
	});

	it('synthesizes an aria-label when none is provided', () => {
		componentRef.setInput('data', [1, 2, 3]);
		fixture.detectChanges();

		expect(component.effectiveAriaLabel()).toBe('Tendencia de 3 días, 6 ocurrencias totales');
	});

	it('honours the provided aria-label', () => {
		componentRef.setInput('data', [1, 2, 3]);
		componentRef.setInput('ariaLabel', 'Trend del grupo X');
		fixture.detectChanges();

		expect(component.effectiveAriaLabel()).toBe('Trend del grupo X');
		const svg = fixture.nativeElement.querySelector('svg.mini-sparkline');
		expect(svg.getAttribute('aria-label')).toBe('Trend del grupo X');
	});

	it('describes inactivity in aria-label when data is empty', () => {
		componentRef.setInput('data', []);
		fixture.detectChanges();

		expect(component.effectiveAriaLabel()).toBe('Sin actividad en los últimos 30 días');
		const empty = fixture.nativeElement.querySelector('.mini-sparkline__empty');
		expect(empty.getAttribute('aria-label')).toBe('Sin actividad en los últimos 30 días');
	});

	it('flattens the line at mid-height when all values are equal but non-zero', () => {
		componentRef.setInput('data', [5, 5, 5, 5]);
		componentRef.setInput('height', 40);
		fixture.detectChanges();

		const geometry = component.path();
		expect(geometry).not.toBeNull();
		const ys = geometry!.d.match(/(\d+(\.\d+)?)/g)?.filter((_, i) => i % 2 === 1) ?? [];
		ys.forEach((y) => expect(Number(y)).toBe(20));
	});

	it('renders a single-point marker without a path when data has length 1', () => {
		componentRef.setInput('data', [7]);
		fixture.detectChanges();

		expect(component.path()).toBeNull();
		expect(component.singlePoint()).not.toBeNull();
		const pathEl = fixture.nativeElement.querySelector('path');
		expect(pathEl).toBeNull();
		const circle = fixture.nativeElement.querySelector('circle');
		expect(circle).toBeTruthy();
	});
});
