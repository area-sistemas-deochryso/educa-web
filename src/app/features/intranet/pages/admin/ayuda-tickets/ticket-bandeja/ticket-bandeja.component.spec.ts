// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserPermissionsService } from '@core/services';

import { TicketAdminDto } from '../models/ticket-admin.models';
import { TicketBandejaComponent } from './ticket-bandeja.component';
import { TicketBandejaFacade } from '../services/ticket-bandeja.facade';
// #endregion

const TICKET: TicketAdminDto = {
	id: 1,
	tipoNombre: 'Error técnico',
	descripcion: 'x'.repeat(30),
	propuesta: null,
	estado: 'PENDIENTE',
	usuarioNombre: 'Juan Pérez',
	fechaReg: '2026-07-20T10:00:00Z',
	fechaMod: null,
	rowVersion: 'AAAA',
};

describe('TicketBandejaComponent', () => {
	function setup(hasCapability: boolean) {
		const facadeMock = {
			tickets: signal<TicketAdminDto[]>([TICKET]).asReadonly(),
			loading: signal(false).asReadonly(),
			error: signal(false).asReadonly(),
			filtroEstado: signal(null).asReadonly(),
			updatingId: signal<number | null>(null).asReadonly(),
			init: vi.fn(),
			setFiltro: vi.fn(),
			cambiarEstado: vi.fn(),
		};

		TestBed.overrideComponent(TicketBandejaComponent, {
			set: { providers: [{ provide: TicketBandejaFacade, useValue: facadeMock }] },
		});

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: UserPermissionsService, useValue: { hasCapability: () => hasCapability } },
			],
		});

		const fixture = TestBed.createComponent(TicketBandejaComponent);
		const component = fixture.componentInstance;
		fixture.detectChanges();
		return { component, facadeInit: facadeMock.init, facade: facadeMock };
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('con AYUDA_TICKET_MANAGE, inicializa la bandeja', () => {
		const { component, facadeInit } = setup(true);
		expect(component.canAccess).toBe(true);
		expect(facadeInit).toHaveBeenCalled();
	});

	it('sin AYUDA_TICKET_MANAGE, no accede: no inicializa la bandeja', () => {
		const { component, facadeInit } = setup(false);
		expect(component.canAccess).toBe(false);
		expect(facadeInit).not.toHaveBeenCalled();
	});

	it('onEstadoChange() con el mismo estado no dispara cambiarEstado()', () => {
		const { component, facade } = setup(true);
		component.onEstadoChange(TICKET, TICKET.estado);
		expect(facade.cambiarEstado).not.toHaveBeenCalled();
	});

	it('onEstadoChange() con un estado distinto dispara cambiarEstado()', () => {
		const { component, facade } = setup(true);
		component.onEstadoChange(TICKET, 'RESUELTO');
		expect(facade.cambiarEstado).toHaveBeenCalledWith(TICKET, 'RESUELTO');
	});
});
