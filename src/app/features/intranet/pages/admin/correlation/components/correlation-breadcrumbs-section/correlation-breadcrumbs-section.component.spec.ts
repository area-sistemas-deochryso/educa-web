// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CorrelationBreadcrumbDto } from '../../models';
import { CorrelationBreadcrumbsSectionComponent } from './correlation-breadcrumbs-section.component';
// #endregion

const STEPS: CorrelationBreadcrumbDto[] = [
	{ tipo: 'navigation', offsetMs: 4_200, ruta: '/intranet/estudiante/curso/:id', metodo: null, statusCode: null, errorClass: null },
	{ tipo: 'http', offsetMs: 800, ruta: '/api/cursos/:id', metodo: 'GET', statusCode: 500, errorClass: null },
	{ tipo: 'error', offsetMs: 0, ruta: '/intranet/estudiante/curso/:id', metodo: null, statusCode: null, errorClass: 'TypeError' },
];

// #region Tests
describe('CorrelationBreadcrumbsSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationBreadcrumbsSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [CorrelationBreadcrumbsSectionComponent] }).compileComponents();
		fixture = TestBed.createComponent(CorrelationBreadcrumbsSectionComponent);
	});

	function text(): string {
		fixture.detectChanges();
		return (fixture.nativeElement as HTMLElement).textContent ?? '';
	}

	it('shows an explicit empty state instead of hiding the section', () => {
		expect(text()).toContain('Pasos previos');
		expect(text()).toContain('Sin pasos previos registrados');
	});

	it('renders one step per breadcrumb in order, with method, status and error class', () => {
		fixture.componentRef.setInput('items', STEPS);

		const content = text();
		expect((fixture.nativeElement as HTMLElement).querySelectorAll('li')).toHaveLength(3);
		expect(content).toContain('/api/cursos/:id');
		expect(content).toContain('GET');
		expect(content).toContain('500');
		expect(content).toContain('TypeError');
		expect(content).not.toContain('Sin pasos previos registrados');
	});

	it('does not render "undefined" for fields the BE omits', () => {
		fixture.componentRef.setInput('items', [{ tipo: 'navigation', offsetMs: 100, ruta: '/intranet' }]);

		expect(text()).not.toContain('undefined');
		expect((fixture.nativeElement as HTMLElement).querySelector('edu-tag')).toBeNull();
	});

	it.each([
		[0, 'al momento del error'],
		[340, 'hace 340 ms'],
		[2_300, 'hace 2,3 s'],
		[125_000, 'hace 2 min 5 s'],
	])('formats %i ms as "%s"', (ms, expected) => {
		expect(fixture.componentInstance.formatOffset(ms)).toBe(expected);
	});
});
// #endregion
