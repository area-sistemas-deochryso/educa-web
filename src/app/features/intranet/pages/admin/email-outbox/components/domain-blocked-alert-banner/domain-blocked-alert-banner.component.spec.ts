import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
	HttpTestingController,
	provideHttpClientTesting,
} from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DomainBlockedAlertBannerComponent } from './domain-blocked-alert-banner.component';

describe('DomainBlockedAlertBannerComponent', () => {
	let fixture: ComponentFixture<DomainBlockedAlertBannerComponent>;
	let component: DomainBlockedAlertBannerComponent;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [DomainBlockedAlertBannerComponent],
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		fixture = TestBed.createComponent(DomainBlockedAlertBannerComponent);
		component = fixture.componentInstance;
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('renderiza nada cuando no hay eventos en últimas 12h', () => {
		fixture.detectChanges();
		const req = httpMock.expectOne((r) =>
			r.url.endsWith('/api/sistema/email-outbox/defer-events'),
		);
		req.flush({ data: [], page: 1, pageSize: 10, total: 0 });
		fixture.detectChanges();

		expect(component.hasEvents()).toBe(false);
		expect(fixture.nativeElement.querySelector('.domain-blocked-banner')).toBeNull();
	});

	it('muestra banner cuando hay evento DOMAIN_BLOCKED reciente', () => {
		fixture.detectChanges();
		const req = httpMock.expectOne((r) =>
			r.url.endsWith('/api/sistema/email-outbox/defer-events'),
		);
		req.flush({
			data: [
				{
					id: 1,
					fecha: '2026-04-29T10:00:00',
					tipo: 'DOMAIN_BLOCKED',
					destinatario: null,
					dominio: 'laazulitasac.com',
					statusCode: '550',
					diagnosticCode: 'blocked by cpanel',
					emailOutboxId: null,
					correlationId: null,
				},
			],
			page: 1,
			pageSize: 10,
			total: 1,
		});
		fixture.detectChanges();

		expect(component.hasEvents()).toBe(true);
		const banner = fixture.nativeElement.querySelector('.domain-blocked-banner');
		expect(banner).not.toBeNull();
		expect(banner.textContent).toContain('laazulitasac.com');
	});

	it('aplica filtros tipo=DOMAIN_BLOCKED + desde 12h al cargar', () => {
		fixture.detectChanges();
		const req = httpMock.expectOne((r) =>
			r.url.endsWith('/api/sistema/email-outbox/defer-events'),
		);
		expect(req.request.params.get('tipo')).toBe('DOMAIN_BLOCKED');
		expect(req.request.params.has('desde')).toBe(true);
		req.flush({ data: [], page: 1, pageSize: 10, total: 0 });
	});
});
