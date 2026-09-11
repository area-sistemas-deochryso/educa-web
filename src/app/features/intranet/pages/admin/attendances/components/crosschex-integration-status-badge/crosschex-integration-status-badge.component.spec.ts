// * P10 F3 (DEP-4) — tests del badge pasivo de estado de integración CrossChex.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CrossChexIntegrationStatusBadgeComponent } from './crosschex-integration-status-badge.component';
import { CrossChexIntegrationStatusDto } from '../../services/crosschex-integration-status.service';

const ENDPOINT = /\/api\/sistema\/integration-status$/;

function buildDto(over: Partial<CrossChexIntegrationStatusDto> = {}): CrossChexIntegrationStatusDto {
	return {
		integracion: 'CrossChex',
		ultimoIntentoUtc: '2026-09-11T10:00:00Z',
		ultimoExitoUtc: '2026-09-11T10:00:00Z',
		fallosConsecutivos: 0,
		minutosSinExito: 5,
		estado: 'OK',
		...over,
	};
}

describe('CrossChexIntegrationStatusBadgeComponent', () => {
	let fixture: ComponentFixture<CrossChexIntegrationStatusBadgeComponent>;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			imports: [CrossChexIntegrationStatusBadgeComponent],
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
		vi.useRealTimers();
	});

	it('no renderiza nada antes de la primera respuesta', () => {
		fixture = TestBed.createComponent(CrossChexIntegrationStatusBadgeComponent);
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('edu-tag')).toBeNull();
		httpMock.expectOne(ENDPOINT).flush(buildDto());
	});

	it('muestra severidad success cuando el estado es OK', () => {
		fixture = TestBed.createComponent(CrossChexIntegrationStatusBadgeComponent);
		fixture.detectChanges();

		httpMock.expectOne(ENDPOINT).flush(buildDto({ estado: 'OK', minutosSinExito: 5 }));
		fixture.detectChanges();

		const component = fixture.componentInstance;
		expect(component.isDegraded).toBe(false);
		expect(component.label).toContain('hace 5 minutos');
	});

	it('muestra severidad warn y mensaje de advertencia cuando el estado es DEGRADADO', () => {
		fixture = TestBed.createComponent(CrossChexIntegrationStatusBadgeComponent);
		fixture.detectChanges();

		httpMock.expectOne(ENDPOINT).flush(
			buildDto({ estado: 'DEGRADADO', minutosSinExito: 45, fallosConsecutivos: 3 }),
		);
		fixture.detectChanges();

		const component = fixture.componentInstance;
		expect(component.isDegraded).toBe(true);
		expect(component.label).toContain('CrossChex no responde');
		expect(component.tooltip).toContain('3 fallos consecutivos');
	});

	it('distingue "nunca sincronizado" (minutosSinExito null) de un estado degradado', () => {
		fixture = TestBed.createComponent(CrossChexIntegrationStatusBadgeComponent);
		fixture.detectChanges();

		httpMock.expectOne(ENDPOINT).flush(
			buildDto({ estado: 'OK', ultimoExitoUtc: null, minutosSinExito: null }),
		);
		fixture.detectChanges();

		const component = fixture.componentInstance;
		expect(component.label).toBe('Sin sincronización biométrica registrada');
	});

	it('vuelve a consultar el endpoint cada 60s (polling)', () => {
		fixture = TestBed.createComponent(CrossChexIntegrationStatusBadgeComponent);
		fixture.detectChanges();
		httpMock.expectOne(ENDPOINT).flush(buildDto());

		vi.advanceTimersByTime(60_000);
		httpMock.expectOne(ENDPOINT).flush(buildDto({ minutosSinExito: 10 }));
		fixture.detectChanges();

		expect(fixture.componentInstance.label).toContain('hace 10 minutos');
	});

	it('un fallo de red en el polling no rompe el componente (queda en null, sin throw)', () => {
		fixture = TestBed.createComponent(CrossChexIntegrationStatusBadgeComponent);
		fixture.detectChanges();

		httpMock.expectOne(ENDPOINT).error(new ProgressEvent('network error'));
		fixture.detectChanges();

		expect(fixture.componentInstance.status()).toBeNull();
	});
});
