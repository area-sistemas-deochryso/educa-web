import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CorrelationRequestSectionComponent } from './correlation-request-section.component';
import { CorrelationRequestMetricDto } from '../../models';

function makeMetric(over: Partial<CorrelationRequestMetricDto> = {}): CorrelationRequestMetricDto {
	return {
		route: '/api/usuarios/{id}',
		httpMethod: 'GET',
		statusCode: 500,
		durationMs: 250,
		usuarioDniMasked: '***5678',
		usuarioRol: 'Director',
		plataforma: 'WEB',
		fecha: '2026-09-28T10:00:00',
		routeP95Ms: null,
		...over,
	};
}

describe('CorrelationRequestSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationRequestSectionComponent>;

	async function setup(metric: CorrelationRequestMetricDto | null): Promise<void> {
		await TestBed.configureTestingModule({
			imports: [CorrelationRequestSectionComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationRequestSectionComponent);
		fixture.componentRef.setInput('metric', metric);
		fixture.detectChanges();
	}

	it('sin metric muestra el aviso de "no registrado"', async () => {
		await setup(null);
		const text = fixture.nativeElement.textContent as string;
		expect(text).toContain('no registrado');
	});

	it('con metric pero sin routeP95Ms muestra "Sin dato reciente de p95"', async () => {
		await setup(makeMetric({ routeP95Ms: null }));
		const text = fixture.nativeElement.textContent as string;
		expect(text).toContain('Sin dato reciente de p95');
	});

	it('con routeP95Ms menor a durationMs muestra "Por encima" del p95', async () => {
		await setup(makeMetric({ durationMs: 500, routeP95Ms: 100 }));
		const text = fixture.nativeElement.textContent as string;
		expect(text).toContain('Por encima');
		expect(fixture.componentInstance.comparison()?.overP95).toBe(true);
	});

	it('con routeP95Ms mayor a durationMs muestra "Por debajo" del p95', async () => {
		await setup(makeMetric({ durationMs: 50, routeP95Ms: 200 }));
		const text = fixture.nativeElement.textContent as string;
		expect(text).toContain('Por debajo');
		expect(fixture.componentInstance.comparison()?.overP95).toBe(false);
	});
});
