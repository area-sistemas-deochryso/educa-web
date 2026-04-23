import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DashboardResumenComponent } from './dashboard-resumen.component';

describe('DashboardResumenComponent', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [DashboardResumenComponent] });
	});

	function render(overrides: Partial<Record<string, number>> = {}) {
		const fixture = TestBed.createComponent(DashboardResumenComponent);
		fixture.componentRef.setInput('resumen', {
			enviados: 100,
			fallidos: 20,
			pendientes: 3,
			reintentando: 1,
			formatoInvalido: 5,
			sinCorreo: 2,
			blacklisteados: 4,
			throttleHost: 6,
			otrosFallos: 7,
			deferFailContadorCpanel: 10,
			...overrides,
		});
		fixture.detectChanges();
		return fixture;
	}

	it('renders 3 general cards (Enviados / Fallidos / Pendientes) and 6 breakdown cards with exact values', () => {
		const fixture = render();
		const el: HTMLElement = fixture.nativeElement;

		const generalCards = el.querySelectorAll('.stats-general .stat-card');
		const breakdownCards = el.querySelectorAll('.stats-breakdown .stat-card');

		expect(generalCards.length).toBe(3);
		expect(breakdownCards.length).toBe(6);

		const generalValues = Array.from(generalCards).map(
			(c) => c.querySelector('.stat-value')?.textContent?.trim(),
		);
		const breakdownValues = Array.from(breakdownCards).map(
			(c) => c.querySelector('.stat-value')?.textContent?.trim(),
		);

		expect(generalValues).toEqual(['100', '20', '3']);
		expect(breakdownValues).toEqual(['1', '5', '2', '4', '6', '7']);
	});

	it('applies ok semaphore when deferFailContadorCpanel is below warning threshold', () => {
		const fixture = render({ deferFailContadorCpanel: 5 });
		const banner = fixture.nativeElement.querySelector('.cpanel-banner') as HTMLElement;
		expect(banner.classList.contains('cpanel-banner--ok')).toBe(true);
	});

	it('applies warning semaphore between warning and critical thresholds', () => {
		const fixture = render({ deferFailContadorCpanel: 25 });
		const banner = fixture.nativeElement.querySelector('.cpanel-banner') as HTMLElement;
		expect(banner.classList.contains('cpanel-banner--warning')).toBe(true);
	});

	it('applies critical semaphore at or above critical threshold', () => {
		const fixture = render({ deferFailContadorCpanel: 60 });
		const banner = fixture.nativeElement.querySelector('.cpanel-banner') as HTMLElement;
		expect(banner.classList.contains('cpanel-banner--critical')).toBe(true);
	});

	it('dims breakdown section when fallidos === 0', () => {
		const fixture = render({ fallidos: 0 });
		const section = fixture.nativeElement.querySelector('.stats-breakdown') as HTMLElement;
		expect(section.classList.contains('stats-breakdown--muted')).toBe(true);
	});
});
