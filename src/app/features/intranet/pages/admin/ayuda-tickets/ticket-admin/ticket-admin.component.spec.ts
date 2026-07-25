// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { UserPermissionsService } from '@core/services';

import { TicketAdminComponent } from './ticket-admin.component';
// #endregion

describe('TicketAdminComponent', () => {
	let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

	function setup(hasCapability: boolean, initialTab?: string) {
		queryParamMap$ = new BehaviorSubject(convertToParamMap(initialTab ? { tab: initialTab } : {}));

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: UserPermissionsService, useValue: { hasCapability: () => hasCapability } },
				{ provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$ } },
			],
		});

		const fixture = TestBed.createComponent(TicketAdminComponent);
		const component = fixture.componentInstance;
		fixture.detectChanges();
		return { component };
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('con AYUDA_TICKET_MANAGE, permite el acceso y arranca en el tab bandeja', () => {
		const { component } = setup(true);
		expect(component.canAccess).toBe(true);
		expect(component.activeTab()).toBe('bandeja');
	});

	it('sin AYUDA_TICKET_MANAGE, bloquea el acceso a ambas vistas', () => {
		const { component } = setup(false);
		expect(component.canAccess).toBe(false);
	});

	it('el queryParam ?tab=tipos activa el tab de catálogo', () => {
		const { component } = setup(true, 'tipos');
		expect(component.activeTab()).toBe('tipos');
	});

	it('onTabChange() ignora un value undefined', () => {
		const { component } = setup(true);
		component.onTabChange(undefined);
		expect(component.activeTab()).toBe('bandeja');
	});
});
