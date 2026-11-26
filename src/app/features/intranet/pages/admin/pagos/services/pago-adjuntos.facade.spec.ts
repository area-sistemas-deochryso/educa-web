import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';

import { ConnectivityService } from '@core/services/connectivity';
import type { PagoAdjunto } from '@data/models';
import { PagoAdjuntosApiService } from './pago-adjuntos-api.service';
import {
	ADJUNTO_MAX_BYTES,
	PagoAdjuntosFacade,
	mensajeAdjuntoError,
	validarArchivoAdjunto,
} from './pago-adjuntos.facade';

const downloadBlob = vi.hoisted(() => vi.fn());
vi.mock('@core/helpers', async (importOriginal) => ({
	...(await importOriginal<typeof import('@core/helpers')>()),
	downloadBlob,
}));

function adjunto(id: number, activo = true): PagoAdjunto {
	return {
		id,
		pagoId: 7,
		nombreOriginal: `voucher-${id}.pdf`,
		tipoContenido: 'application/pdf',
		tamanoBytes: 1024,
		activo,
		usuarioReg: 'caja',
		fechaReg: '2026-11-26T10:00:00',
		motivoBaja: activo ? null : 'duplicado',
		usuarioBaja: activo ? null : 'caja',
		fechaBaja: activo ? null : '2026-11-26T11:00:00',
	};
}

function archivo(nombre: string, tipo: string, bytes = 100): File {
	return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

describe('PagoAdjuntosFacade', () => {
	let facade: PagoAdjuntosFacade;
	const online = signal(true);
	const api = { listar: vi.fn(), subir: vi.fn(), descargar: vi.fn(), darDeBaja: vi.fn() };

	beforeEach(() => {
		online.set(true);
		downloadBlob.mockReset();
		api.listar.mockReset().mockReturnValue(of([adjunto(1)]));
		api.subir.mockReset().mockReturnValue(of(adjunto(2)));
		api.descargar.mockReset().mockReturnValue(of({ blob: new Blob(['x']), fileName: 'voucher-1.pdf' }));
		api.darDeBaja.mockReset().mockReturnValue(of({}));
		TestBed.configureTestingModule({
			providers: [
				PagoAdjuntosFacade,
				{ provide: PagoAdjuntosApiService, useValue: api },
				{ provide: ConnectivityService, useValue: { isOnline: online } },
			],
		});
		facade = TestBed.inject(PagoAdjuntosFacade);
		facade.cargar(7);
	});

	it('carga la lista del pago y separa activos de dados de baja', () => {
		api.listar.mockReturnValue(of([adjunto(1), adjunto(3, false)]));
		facade.cargar(7);
		expect(api.listar).toHaveBeenLastCalledWith(7);
		expect(facade.activos().map((a) => a.id)).toEqual([1]);
		expect(facade.dadosDeBaja().map((a) => a.id)).toEqual([3]);
		expect(facade.cargando()).toBe(false);
	});

	it('sube un PDF válido y lo agrega al principio de la lista', () => {
		const alSubir = vi.fn();
		facade.subir(archivo('v.pdf', 'application/pdf'), alSubir);
		expect(api.subir).toHaveBeenCalledWith(7, expect.any(File));
		expect(facade.adjuntos().map((a) => a.id)).toEqual([2, 1]);
		expect(facade.subiendo()).toBe(false);
		expect(facade.error()).toBeNull();
		expect(alSubir).toHaveBeenCalledOnce();
	});

	it('rechaza un tipo no permitido sin llamar al servidor (INV-PG16)', () => {
		facade.subir(archivo('v.gif', 'image/gif'));
		expect(api.subir).not.toHaveBeenCalled();
		expect(facade.error()).toBe('Solo se admiten archivos PDF, JPG o PNG.');
	});

	it('rechaza un archivo de más de 10 MB sin llamar al servidor', () => {
		facade.subir(archivo('foto.jpg', 'image/jpeg', ADJUNTO_MAX_BYTES + 1));
		expect(api.subir).not.toHaveBeenCalled();
		expect(facade.error()).toContain('10 MB');
	});

	it('acepta el tamaño exacto del tope y rechaza uno vacío', () => {
		expect(validarArchivoAdjunto(archivo('a.png', 'image/png', ADJUNTO_MAX_BYTES), 0)).toBeNull();
		expect(validarArchivoAdjunto(archivo('a.png', 'image/png', 0), 0)).toContain('vacío');
	});

	it('rechaza el cuarto voucher activo (límite de 3)', () => {
		api.listar.mockReturnValue(of([adjunto(1), adjunto(2), adjunto(3)]));
		facade.cargar(7);
		expect(facade.llegoAlLimite()).toBe(true);
		facade.subir(archivo('v.pdf', 'application/pdf'));
		expect(api.subir).not.toHaveBeenCalled();
		expect(facade.error()).toContain('3 vouchers');
	});

	it('los dados de baja no cuentan para el límite', () => {
		api.listar.mockReturnValue(of([adjunto(1), adjunto(2), adjunto(3, false), adjunto(4, false)]));
		facade.cargar(7);
		expect(facade.llegoAlLimite()).toBe(false);
	});

	it('sin conexión no sube ni encola: deja el mensaje y no llama al servidor', () => {
		online.set(false);
		expect(facade.sinConexion()).toBe(true);
		facade.subir(archivo('v.pdf', 'application/pdf'));
		expect(api.subir).not.toHaveBeenCalled();
		expect(facade.error()).toContain('Sin conexión');
	});

	it('muestra el texto por errorCode cuando el servidor rechaza la subida y libera el estado', () => {
		api.subir.mockReturnValue(throwError(() => ({ status: 400, error: { errorCode: 'PAGO_ADJUNTO_TIPO_NO_PERMITIDO' } })));
		const alSubir = vi.fn();
		facade.subir(archivo('v.pdf', 'application/pdf'), alSubir);
		expect(facade.error()).toBe('Solo se admiten archivos PDF, JPG o PNG.');
		expect(facade.subiendo()).toBe(false);
		expect(alSubir).not.toHaveBeenCalled();
	});

	it('ignora una segunda subida mientras hay una en curso', () => {
		api.subir.mockReturnValue(new Subject());
		facade.subir(archivo('a.pdf', 'application/pdf'));
		facade.subir(archivo('b.pdf', 'application/pdf'));
		expect(api.subir).toHaveBeenCalledTimes(1);
		expect(facade.subiendo()).toBe(true);
	});

	it('descarga con el nombre que manda el servidor', () => {
		facade.descargar(adjunto(1));
		expect(api.descargar).toHaveBeenCalledWith(7, 1, 'voucher-1.pdf');
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'voucher-1.pdf');
		expect(facade.procesandoId()).toBeNull();
	});

	it('no descarga sin conexión', () => {
		online.set(false);
		facade.descargar(adjunto(1));
		expect(api.descargar).not.toHaveBeenCalled();
		expect(facade.error()).toContain('Sin conexión');
	});

	it('da de baja con motivo, recarga la lista y avisa al terminar (INV-PG16)', () => {
		const alTerminar = vi.fn();
		facade.darDeBaja(adjunto(1), '  duplicado  ', alTerminar);
		expect(api.darDeBaja).toHaveBeenCalledWith(7, 1, 'duplicado');
		expect(alTerminar).toHaveBeenCalledOnce();
		expect(api.listar).toHaveBeenCalledTimes(2);
	});

	it('exige motivo para la baja', () => {
		facade.darDeBaja(adjunto(1), '   ', vi.fn());
		expect(api.darDeBaja).not.toHaveBeenCalled();
		expect(facade.error()).toBe('Escribe el motivo de la baja.');
	});

	it('deja el error y no avisa cuando la baja falla', () => {
		api.darDeBaja.mockReturnValue(throwError(() => ({ status: 400, error: { errorCode: 'PAGO_ADJUNTO_YA_DADO_DE_BAJA' } })));
		const alTerminar = vi.fn();
		facade.darDeBaja(adjunto(1), 'duplicado', alTerminar);
		expect(facade.error()).toContain('ya fue dado de baja');
		expect(alTerminar).not.toHaveBeenCalled();
		expect(facade.procesandoId()).toBeNull();
	});

	it('descarta la respuesta de un pago anterior si se cargó otro mientras tanto', () => {
		const lenta = new Subject<PagoAdjunto[]>();
		api.listar.mockReturnValue(lenta);
		facade.cargar(7);
		api.listar.mockReturnValue(of([adjunto(9)]));
		facade.cargar(8);
		lenta.next([adjunto(1)]);
		expect(facade.adjuntos().map((a) => a.id)).toEqual([9]);
	});

	describe('mensajeAdjuntoError', () => {
		it('mapea status sin errorCode y nunca expone texto del servidor', () => {
			expect(mensajeAdjuntoError({ status: 0 }, 'x')).toContain('No hay conexión');
			expect(mensajeAdjuntoError({ status: 403 }, 'x')).toContain('permiso');
			expect(mensajeAdjuntoError({ status: 429 }, 'x')).toContain('Espera');
			expect(mensajeAdjuntoError({ status: 500, error: { message: 'INV-PG16 boom' } }, 'adjuntar el voucher')).toBe(
				'No se pudo adjuntar el voucher. Inténtalo de nuevo.',
			);
		});
	});
});
