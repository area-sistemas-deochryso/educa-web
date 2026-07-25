// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@env/environment';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';

import { ActualizarFaqRequest, CrearFaqRequest, FaqAdminDto } from '../models/faq-admin.models';
import { FaqAdminFacade } from './faq-admin.facade';
// #endregion

const FAQ_ADMIN_API = `${environment.apiUrl}/api/admin/faq`;

interface CapturedConfig {
	operation: 'CREATE' | 'UPDATE' | 'DELETE';
	onCommit: (result: unknown) => void;
	onError: (err: unknown) => void;
}

const faq = (overrides: Partial<FaqAdminDto> = {}): FaqAdminDto => ({
	id: 1,
	pregunta: '¿Cómo cambio mi contraseña?',
	respuesta: 'Ve a...',
	categoria: 'Cuenta',
	capabilityId: null,
	capabilityCodigo: null,
	estado: true,
	wizard: null,
	rowVersion: 'AAAA',
	...overrides,
});

describe('FaqAdminFacade', () => {
	let facade: FaqAdminFacade;
	let httpMock: HttpTestingController;
	let walHelper: { execute: ReturnType<typeof vi.fn> };
	let errorHandler: {
		showSuccess: ReturnType<typeof vi.fn>;
		showError: ReturnType<typeof vi.fn>;
		showWarning: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		walHelper = { execute: vi.fn() };
		errorHandler = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				FaqAdminFacade,
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: WalFacadeHelper, useValue: walHelper },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});

		facade = TestBed.inject(FaqAdminFacade);
		httpMock = TestBed.inject(HttpTestingController);
	});

	function captureConfig(): CapturedConfig {
		expect(walHelper.execute).toHaveBeenCalled();
		return walHelper.execute.mock.calls[walHelper.execute.mock.calls.length - 1][0] as CapturedConfig;
	}

	// #region Load — activas e inactivas
	it('load() trae FAQ activas e inactivas (a diferencia del listado público)', () => {
		facade.load();
		const req = httpMock.expectOne(FAQ_ADMIN_API);
		req.flush([faq({ id: 1, estado: true }), faq({ id: 2, estado: false })]);

		expect(facade.faqs()).toHaveLength(2);
		expect(facade.faqs().some((f) => !f.estado)).toBe(true);
	});

	it('error de red deja faqs vacío y marca error()', () => {
		facade.load();
		const req = httpMock.expectOne(FAQ_ADMIN_API);
		req.flush('fail', { status: 500, statusText: 'Server Error' });

		expect(facade.error()).toBe(true);
		expect(facade.faqs()).toEqual([]);
	});
	// #endregion

	// #region Crear
	it('crear() sin wizard llama wal.execute con operation CREATE', () => {
		const request: CrearFaqRequest = {
			pregunta: 'Nueva pregunta',
			respuesta: 'Nueva respuesta',
			categoria: null,
			capabilityId: null,
			wizard: null,
		};
		const onSuccess = vi.fn();

		facade.crear(request, onSuccess);
		const cfg = captureConfig();
		expect(cfg.operation).toBe('CREATE');

		const created = faq({ id: 10, pregunta: 'Nueva pregunta', wizard: null });
		cfg.onCommit(created);

		expect(facade.faqs()[0]).toEqual(created);
		expect(onSuccess).toHaveBeenCalled();
	});

	it('crear() con wizard de 2+ pasos preserva el orden al recibir la respuesta', () => {
		const request: CrearFaqRequest = {
			pregunta: '¿Cómo registro asistencia?',
			respuesta: 'Ve a...',
			categoria: 'Asistencia',
			capabilityId: null,
			wizard: {
				titulo: 'Registrar asistencia',
				pasos: [
					{ orden: 1, texto: 'Paso 1', imagenUrl: null },
					{ orden: 2, texto: 'Paso 2', imagenUrl: 'https://x/img2.png' },
				],
			},
		};
		const onSuccess = vi.fn();

		facade.crear(request, onSuccess);
		const cfg = captureConfig();

		const created = faq({ id: 11, wizard: request.wizard });
		cfg.onCommit(created);

		expect(facade.faqs()[0].wizard?.pasos.map((p) => p.orden)).toEqual([1, 2]);
		expect(facade.faqs()[0].wizard?.pasos.map((p) => p.texto)).toEqual(['Paso 1', 'Paso 2']);
	});

	it('crear() sin capability de gating (null) queda visible a todos', () => {
		const request: CrearFaqRequest = {
			pregunta: 'Genérica',
			respuesta: 'Respuesta',
			categoria: null,
			capabilityId: null,
			wizard: null,
		};

		facade.crear(request, vi.fn());
		const cfg = captureConfig();
		const created = faq({ id: 12, capabilityId: null, capabilityCodigo: null });
		cfg.onCommit(created);

		expect(facade.faqs()[0].capabilityId).toBeNull();
	});
	// #endregion

	// #region Actualizar — reemplazo en bloque del wizard
	it('actualizar() reemplaza el wizard en bloque (agregar/quitar pasos)', () => {
		facade.load();
		httpMock.expectOne(FAQ_ADMIN_API).flush([
			faq({
				id: 1,
				wizard: { titulo: null, pasos: [{ orden: 1, texto: 'Viejo paso único', imagenUrl: null }] },
			}),
		]);

		const request: ActualizarFaqRequest = {
			pregunta: '¿Cómo cambio mi contraseña?',
			respuesta: 'Ve a...',
			categoria: 'Cuenta',
			capabilityId: null,
			wizard: {
				titulo: 'Nuevo wizard',
				pasos: [
					{ orden: 1, texto: 'Paso nuevo 1', imagenUrl: null },
					{ orden: 2, texto: 'Paso nuevo 2', imagenUrl: null },
				],
			},
			rowVersion: 'AAAA',
		};

		facade.actualizar(1, request, vi.fn());
		const cfg = captureConfig();
		expect(cfg.operation).toBe('UPDATE');

		const updated = faq({ id: 1, wizard: request.wizard, rowVersion: 'BBBB' });
		cfg.onCommit(updated);

		expect(facade.faqs()[0].wizard?.pasos).toHaveLength(2);
		expect(facade.faqs()[0].wizard?.titulo).toBe('Nuevo wizard');
	});

	it('actualizar() con conflicto 409 muestra warning y recarga', () => {
		const request: ActualizarFaqRequest = {
			pregunta: 'x',
			respuesta: 'y',
			categoria: null,
			capabilityId: null,
			wizard: null,
			rowVersion: 'STALE',
		};

		facade.actualizar(1, request, vi.fn());
		const cfg = captureConfig();

		cfg.onError(new HttpErrorResponse({ status: 409 }));

		expect(errorHandler.showWarning).toHaveBeenCalled();
		httpMock.expectOne(FAQ_ADMIN_API).flush([]);
	});
	// #endregion

	// #region Eliminar
	it('eliminar() la saca del listado local tras confirmar el server', () => {
		facade.load();
		httpMock.expectOne(FAQ_ADMIN_API).flush([faq({ id: 1 }), faq({ id: 2 })]);

		facade.eliminar(faq({ id: 1 }), vi.fn());
		const cfg = captureConfig();
		expect(cfg.operation).toBe('DELETE');

		cfg.onCommit(undefined);

		expect(facade.faqs().map((f) => f.id)).toEqual([2]);
	});
	// #endregion
});
