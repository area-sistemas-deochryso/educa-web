import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';

import { DashboardBouncersTableComponent } from './dashboard-bouncers-table.component';

describe('DashboardBouncersTableComponent', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [DashboardBouncersTableComponent],
			providers: [
				{
					provide: ErrorHandlerService,
					useValue: { showError: () => {}, showSuccess: () => {} },
				},
			],
		});
	});

	it('renders the masked destinatarios exactly as received (no re-masking)', () => {
		const fixture = TestBed.createComponent(DashboardBouncersTableComponent);
		fixture.componentRef.setInput('data', [
			{
				destinatarioMasked: 'j***z@dominio.com',
				bouncesAcumulados: 2,
				ultimoIntento: '2026-04-23T10:00:00',
				ultimoError: '5.1.1 mailbox unknown',
			},
			{
				destinatarioMasked: 'a***o@colegio.edu.pe',
				bouncesAcumulados: 4,
				ultimoIntento: '2026-04-23T11:00:00',
				ultimoError: '5.7.1 blocked',
			},
		]);
		fixture.detectChanges();

		const cells = fixture.nativeElement.querySelectorAll('.cell-dest code') as NodeListOf<HTMLElement>;
		expect(cells.length).toBe(2);
		expect(cells[0].textContent?.trim()).toBe('j***z@dominio.com');
		expect(cells[1].textContent?.trim()).toBe('a***o@colegio.edu.pe');
	});

	it('marks row 3+ bounces as critical and row 2 bounces as warning', () => {
		const fixture = TestBed.createComponent(DashboardBouncersTableComponent);
		fixture.componentRef.setInput('data', [
			{
				destinatarioMasked: 'a***z@x.com',
				bouncesAcumulados: 2,
				ultimoIntento: '2026-04-23T10:00:00',
				ultimoError: 'bounce',
			},
			{
				destinatarioMasked: 'b***z@x.com',
				bouncesAcumulados: 3,
				ultimoIntento: '2026-04-23T10:00:00',
				ultimoError: 'bounce',
			},
		]);
		fixture.detectChanges();

		const rows = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
		expect(rows[0].classList.contains('row-warning')).toBe(true);
		expect(rows[0].classList.contains('row-critical')).toBe(false);
		expect(rows[1].classList.contains('row-critical')).toBe(true);
		expect(rows[1].classList.contains('row-warning')).toBe(false);
	});
});
