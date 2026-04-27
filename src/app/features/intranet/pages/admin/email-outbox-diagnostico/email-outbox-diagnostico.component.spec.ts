import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailOutboxDiagnosticoComponent } from './email-outbox-diagnostico.component';

describe('EmailOutboxDiagnosticoComponent', () => {
	let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
	let routerNavigateSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
		routerNavigateSpy = vi.fn().mockResolvedValue(true);

		TestBed.configureTestingModule({
			imports: [EmailOutboxDiagnosticoComponent],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: ActivatedRoute,
					useValue: { queryParamMap: queryParamMap$.asObservable() },
				},
				{
					provide: Router,
					useValue: { navigate: routerNavigateSpy, events: EMPTY },
				},
			],
		});
	});

	it('default activeTab es "gap" cuando no hay query param ?tab=', () => {
		const fixture = TestBed.createComponent(EmailOutboxDiagnosticoComponent);
		fixture.detectChanges();
		expect(fixture.componentInstance.activeTab()).toBe('gap');
	});

	it('activeTab refleja el query param ?tab=correo', () => {
		queryParamMap$.next(convertToParamMap({ tab: 'correo' }));
		const fixture = TestBed.createComponent(EmailOutboxDiagnosticoComponent);
		fixture.detectChanges();
		expect(fixture.componentInstance.activeTab()).toBe('correo');
	});

	it('activeTab cae a "gap" cuando el query param ?tab= no es válido', () => {
		queryParamMap$.next(convertToParamMap({ tab: 'inexistente' }));
		const fixture = TestBed.createComponent(EmailOutboxDiagnosticoComponent);
		fixture.detectChanges();
		expect(fixture.componentInstance.activeTab()).toBe('gap');
	});

	it('initialCorreo expone el query param ?correo= cuando existe', () => {
		queryParamMap$.next(convertToParamMap({ tab: 'correo', correo: 'test@x.com' }));
		const fixture = TestBed.createComponent(EmailOutboxDiagnosticoComponent);
		fixture.detectChanges();
		expect(fixture.componentInstance.initialCorreo()).toBe('test@x.com');
	});

	it('onTabChange navega manteniendo merge de query params', () => {
		const fixture = TestBed.createComponent(EmailOutboxDiagnosticoComponent);
		fixture.detectChanges();

		fixture.componentInstance.onTabChange('correo');

		expect(routerNavigateSpy).toHaveBeenCalledWith(
			[],
			expect.objectContaining({
				queryParams: { tab: 'correo' },
				queryParamsHandling: 'merge',
			}),
		);
	});

	it('onTabChange ignora valores inválidos (no navega)', () => {
		const fixture = TestBed.createComponent(EmailOutboxDiagnosticoComponent);
		fixture.detectChanges();

		fixture.componentInstance.onTabChange('inexistente');
		fixture.componentInstance.onTabChange(undefined);

		expect(routerNavigateSpy).not.toHaveBeenCalled();
	});
});
