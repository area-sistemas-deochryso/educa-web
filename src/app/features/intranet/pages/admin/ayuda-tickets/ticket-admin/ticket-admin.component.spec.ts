// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TicketAdminShellComponent } from './ticket-admin.component';
// #endregion

describe('TicketAdminShellComponent', () => {
	let routerEvents$: Subject<unknown>;
	let navigateSpy: ReturnType<typeof vi.fn>;

	function setup(firstChildSegment?: string) {
		routerEvents$ = new Subject();
		navigateSpy = vi.fn();

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						firstChild: firstChildSegment
							? { snapshot: { url: [{ path: firstChildSegment }] } }
							: undefined,
					},
				},
				{
					provide: Router,
					useValue: { events: routerEvents$.asObservable(), navigate: navigateSpy },
				},
			],
		});

		const fixture = TestBed.createComponent(TicketAdminShellComponent);
		const component = fixture.componentInstance;
		fixture.detectChanges();
		return { component };
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('sin ruta hija activa, arranca en el tab bandeja por default', () => {
		const { component } = setup();
		expect(component.activeTab()).toBe('bandeja');
	});

	it('detecta el tab tipos cuando la ruta hija activa es /tipos', () => {
		const { component } = setup('tipos');
		expect(component.activeTab()).toBe('tipos');
	});

	it('onTabChange() ignora un value undefined y no navega', () => {
		const { component } = setup();
		component.onTabChange(undefined);
		expect(navigateSpy).not.toHaveBeenCalled();
	});

	it('onTabChange() navega al segmento elegido, relativo a la ruta activa', () => {
		const { component } = setup();
		component.onTabChange('tipos');
		expect(navigateSpy).toHaveBeenCalledWith(['tipos'], { relativeTo: expect.anything() });
	});
});
