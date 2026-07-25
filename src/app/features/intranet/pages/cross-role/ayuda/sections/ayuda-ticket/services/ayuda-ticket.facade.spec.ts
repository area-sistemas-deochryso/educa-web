// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '@env/environment';
import { CrearTicketDto, TicketDto, TicketTipoDto } from '@features/intranet/pages/cross-role/ayuda/models/ticket.models';
import { AyudaTicketFacade } from './ayuda-ticket.facade';
// #endregion

const TIPOS_API = `${environment.apiUrl}/api/tickets/tipos`;
const CREAR_API = `${environment.apiUrl}/api/tickets`;
const MIOS_API = `${environment.apiUrl}/api/tickets/mios`;

const TIPOS: TicketTipoDto[] = [
	{ id: 1, nombre: 'Error técnico' },
	{ id: 2, nombre: 'Sugerencia' },
];

const TICKETS: TicketDto[] = [
	{
		id: 1,
		tipoNombre: 'Error técnico',
		descripcion: 'La página no carga correctamente en el módulo de asistencia.',
		propuesta: null,
		estado: 'PENDIENTE',
		fechaReg: '2026-07-20T10:00:00Z',
		fechaMod: null,
	},
];

describe('AyudaTicketFacade', () => {
	let facade: AyudaTicketFacade;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [AyudaTicketFacade, provideHttpClient(), provideHttpClientTesting()],
		});

		facade = TestBed.inject(AyudaTicketFacade);
		httpMock = TestBed.inject(HttpTestingController);
	});

	it('init() carga el catálogo de tipos y el historial propio', () => {
		facade.init();

		httpMock.expectOne(TIPOS_API).flush(TIPOS);
		httpMock.expectOne(MIOS_API).flush(TICKETS);

		expect(facade.tipos()).toEqual(TIPOS);
		expect(facade.tickets()).toEqual(TICKETS);
	});

	it('crear() hace POST y refresca el historial en éxito', async () => {
		facade.init();
		httpMock.expectOne(TIPOS_API).flush(TIPOS);
		httpMock.expectOne(MIOS_API).flush(TICKETS);

		const dto: CrearTicketDto = { tipoId: 1, descripcion: 'x'.repeat(25), propuesta: null };
		const resultPromise = facade.crear(dto);

		const createReq = httpMock.expectOne(CREAR_API);
		expect(createReq.request.method).toBe('POST');
		expect(createReq.request.body).toEqual(dto);
		createReq.flush(TICKETS[0]);

		// onCommit dispara loadTickets() de forma síncrona antes de resolver la
		// promesa — el GET de refresco ya está en vuelo cuando `resultPromise`
		// se resuelve, así que se responde después de awaitearla.
		expect(await resultPromise).toBe(true);
		expect(facade.submitError()).toBe(false);

		httpMock.expectOne(MIOS_API).flush(TICKETS);
	});

	it('crear() marca submitError() y resuelve false ante un error del servidor', async () => {
		facade.init();
		httpMock.expectOne(TIPOS_API).flush(TIPOS);
		httpMock.expectOne(MIOS_API).flush(TICKETS);

		const resultPromise = facade.crear({ tipoId: 1, descripcion: 'x'.repeat(25) });

		httpMock.expectOne(CREAR_API).flush('fail', { status: 500, statusText: 'Server Error' });

		expect(await resultPromise).toBe(false);
		expect(facade.submitError()).toBe(true);
	});

	it('error de red al cargar el historial marca error()', () => {
		facade.init();
		httpMock.expectOne(TIPOS_API).flush(TIPOS);
		httpMock.expectOne(MIOS_API).flush('fail', { status: 500, statusText: 'Server Error' });

		expect(facade.error()).toBe(true);
		expect(facade.tickets()).toEqual([]);
	});
});
