// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserPermissionsService } from '@core/services';

import { TicketTipoAdminDto } from '../models/ticket-admin.models';
import { TicketTiposComponent } from './ticket-tipos.component';
import { TicketTipoCatalogoFacade } from '../services/ticket-tipo-catalogo.facade';
// #endregion

const TIPO: TicketTipoAdminDto = { id: 1, nombre: 'Error técnico', estado: true, rowVersion: 'AAAA' };

describe('TicketTiposComponent', () => {
	function setup(hasCapability: boolean) {
		const facadeMock = {
			tipos: signal<TicketTipoAdminDto[]>([TIPO]).asReadonly(),
			loading: signal(false).asReadonly(),
			error: signal(false).asReadonly(),
			submitting: signal(false).asReadonly(),
			init: vi.fn(),
			crear: vi.fn(),
			editar: vi.fn(),
			toggleEstado: vi.fn(),
		};

		TestBed.overrideComponent(TicketTiposComponent, {
			set: { providers: [{ provide: TicketTipoCatalogoFacade, useValue: facadeMock }] },
		});

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: UserPermissionsService, useValue: { hasCapability: () => hasCapability } },
			],
		});

		const fixture = TestBed.createComponent(TicketTiposComponent);
		const component = fixture.componentInstance;
		fixture.detectChanges();
		return { component, facadeInit: facadeMock.init, facade: facadeMock };
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('con AYUDA_TICKET_MANAGE, inicializa el catálogo', () => {
		const { component, facadeInit } = setup(true);
		expect(component.canAccess).toBe(true);
		expect(facadeInit).toHaveBeenCalled();
	});

	it('sin AYUDA_TICKET_MANAGE, no accede: no inicializa el catálogo', () => {
		const { component, facadeInit } = setup(false);
		expect(component.canAccess).toBe(false);
		expect(facadeInit).not.toHaveBeenCalled();
	});

	it('openCreateDialog() abre el diálogo sin tipo en edición', () => {
		const { component } = setup(true);
		component.openCreateDialog();
		expect(component.dialogVisible()).toBe(true);
		expect(component.editingTipo()).toBeNull();
		expect(component.nombreForm()).toBe('');
	});

	it('openEditDialog() precarga el nombre del tipo', () => {
		const { component } = setup(true);
		component.openEditDialog(TIPO);
		expect(component.editingTipo()).toEqual(TIPO);
		expect(component.nombreForm()).toBe('Error técnico');
	});

	it('guardar() con un tipo en edición llama a editar(), no a crear()', () => {
		const { component, facade } = setup(true);
		component.openEditDialog(TIPO);
		component.onNombreChange('Nombre editado');
		component.guardar();

		expect(facade.editar).toHaveBeenCalledWith(TIPO, 'Nombre editado');
		expect(facade.crear).not.toHaveBeenCalled();
		expect(component.dialogVisible()).toBe(false);
	});

	it('guardar() sin tipo en edición llama a crear()', () => {
		const { component, facade } = setup(true);
		component.openCreateDialog();
		component.onNombreChange('Tipo nuevo');
		component.guardar();

		expect(facade.crear).toHaveBeenCalledWith('Tipo nuevo');
	});

	it('toggleEstado() delega en el facade sin ofrecer una acción de eliminar', () => {
		const { component, facade } = setup(true);
		component.toggleEstado(TIPO);
		expect(facade.toggleEstado).toHaveBeenCalledWith(TIPO);
	});
});
