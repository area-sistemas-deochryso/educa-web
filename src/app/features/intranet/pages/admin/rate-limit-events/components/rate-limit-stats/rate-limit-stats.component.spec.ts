import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { RateLimitStats } from '../../models';
import { RateLimitStatsComponent } from './rate-limit-stats.component';

describe('RateLimitStatsComponent', () => {
	let fixture: ComponentFixture<RateLimitStatsComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [RateLimitStatsComponent] });
		fixture = TestBed.createComponent(RateLimitStatsComponent);
	});

	it('renderiza 4 stat cards con valores correctos', () => {
		const stats: RateLimitStats = {
			horas: 24,
			desde: '2026-04-20T10:00:00',
			total: 123,
			totalRechazados: 80,
			topRoles: [{ key: 'Estudiante', total: 60, rechazados: 45 }],
			topEndpoints: [{ key: '/api/reports/heavy', total: 40, rechazados: 30 }],
		};
		fixture.componentRef.setInput('stats', stats);
		fixture.detectChanges();

		const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(html).toContain('123');
		expect(html).toContain('80');
		expect(html).toContain('Estudiante');
		expect(html).toContain('/api/reports/heavy');
	});

	it('con totalRechazados > 50 aplica clase stat-card--critical', () => {
		const stats: RateLimitStats = {
			horas: 24,
			desde: '2026-04-20T10:00:00',
			total: 200,
			totalRechazados: 75,
			topRoles: [],
			topEndpoints: [],
		};
		fixture.componentRef.setInput('stats', stats);
		fixture.detectChanges();

		const criticalCard = (fixture.nativeElement as HTMLElement).querySelector(
			'.stat-card--critical',
		);
		expect(criticalCard).toBeTruthy();
	});

	it('sin stats muestra placeholders', () => {
		fixture.componentRef.setInput('stats', null);
		fixture.detectChanges();

		const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(html).toContain('sin datos');
	});
});
