import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ExcelService } from '@core/services/excel';
import type { VistaPreviaImportacion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { ImportacionFacade } from './importacion.facade';

const HOJA = [
	{ Concepto: 'PENSION', Tipo: 'SALDO', Estado: 'DEBE', Cuota: 9, Apellidos: 'Torres', Nombres: 'Luis' },
	{ Concepto: 'PENSION', Tipo: 'SALDO', Estado: 'DEBE', Cuota: 9, Apellidos: 'Perez', Nombres: 'Ana' },
];

const vp = (aplicables: number, ambigua = false): VistaPreviaImportacion => ({
	anio: 2026,
	aplicables,
	porEstado: [],
	filas: [
		{ numero: 2, estado: 'LISTA', mensaje: null, estudianteId: 1, alumno: 'Torres, Luis', cargoId: 5, candidatos: [] },
		ambigua
			? {
					numero: 3,
					estado: 'SIN_RESOLVER',
					mensaje: 'Hay 2 alumnos.',
					estudianteId: null,
					alumno: null,
					cargoId: null,
					candidatos: [{ estudianteId: 40, nombre: 'Perez Ana', salon: '3.º A' }],
				}
			: { numero: 3, estado: 'LISTA', mensaje: null, estudianteId: 2, alumno: 'Perez, Ana', cargoId: 6, candidatos: [] },
	],
});

function crear(api: Record<string, unknown>, hoja: unknown[] = HOJA) {
	const excel = { parseXlsx: vi.fn(async () => [{ sheetName: 'Datos', data: hoja }]), exportToXlsx: vi.fn(async () => undefined) };
	TestBed.configureTestingModule({
		providers: [ImportacionFacade, { provide: PagosApiService, useValue: api }, { provide: ExcelService, useValue: excel }],
	});
	return { facade: TestBed.inject(ImportacionFacade), excel };
}

// jsdom no implementa `File.arrayBuffer()`; el contenido da igual porque `ExcelService` está simulado.
const archivo = () => ({ name: 'saldos.xlsx', arrayBuffer: async () => new ArrayBuffer(1) }) as unknown as File;

describe('ImportacionFacade', () => {
	it('al leer el archivo calcula la vista previa sin confirmar nada', async () => {
		const vistaPreviaImportacion = vi.fn(() => of(vp(2)));
		const confirmarImportacion = vi.fn();
		const { facade } = crear({ vistaPreviaImportacion, confirmarImportacion });
		facade.cambiarAnio(2026);

		await facade.leerArchivo(archivo());

		expect(facade.leidas()).toHaveLength(2);
		expect(vistaPreviaImportacion).toHaveBeenCalledOnce();
		const payload = (vistaPreviaImportacion.mock.calls as unknown as [{ anio: number; filas: { numero: number }[] }][])[0][0];
		expect(payload.anio).toBe(2026);
		expect(payload.filas.map((f) => f.numero)).toEqual([2, 3]);
		expect(facade.vistaPrevia()?.aplicables).toBe(2);
		expect(confirmarImportacion).not.toHaveBeenCalled();
	});

	it('un archivo que no es la plantilla muestra el motivo y no llama al BE', async () => {
		const vistaPreviaImportacion = vi.fn();
		const { facade } = crear({ vistaPreviaImportacion }, [{ DNI: '1' }]);

		await facade.leerArchivo(archivo());

		expect(facade.errorLectura()).toContain('Concepto');
		expect(facade.leidas()).toHaveLength(0);
		expect(vistaPreviaImportacion).not.toHaveBeenCalled();
	});

	it('elegir el alumno de una fila ambigua reenvía la vista previa con su estudianteId', async () => {
		const vistaPreviaImportacion = vi.fn().mockReturnValueOnce(of(vp(1, true))).mockReturnValueOnce(of(vp(2)));
		const { facade } = crear({ vistaPreviaImportacion });
		await facade.leerArchivo(archivo());

		facade.resolver(3, 40);

		const segundo = (vistaPreviaImportacion.mock.calls as unknown as [{ filas: { numero: number; estudianteId?: number }[] }][])[1][0];
		expect(segundo.filas.find((f) => f.numero === 3)?.estudianteId).toBe(40);
		expect(facade.vistaPrevia()?.aplicables).toBe(2);
	});

	it('una fila descartada no viaja en la confirmación', async () => {
		const vistaPreviaImportacion = vi.fn(() => of(vp(1, true)));
		const confirmarImportacion = vi.fn(() => of({ saldosConfirmados: 1, pagos: 0, descuentos: 0, fallidas: [] }));
		const { facade } = crear({ vistaPreviaImportacion, confirmarImportacion });
		await facade.leerArchivo(archivo());

		facade.descartar(3);
		facade.confirmar();

		const payload = (confirmarImportacion.mock.calls as unknown as [{ filas: { numero: number }[]; filasEsperadas: number }][])[0][0];
		expect(payload.filas.map((f) => f.numero)).toEqual([2]);
		expect(payload.filasEsperadas).toBe(1);
		expect(facade.filasVista().find((f) => f.numero === 3)?.estado).toBe('DESCARTADA');
	});

	it('confirma con las aplicables de la vista previa, deja el resultado y las fallidas por fila', async () => {
		const resultado = { saldosConfirmados: 1, pagos: 0, descuentos: 0, fallidas: [{ numero: 3, mensaje: 'El cargo cambió.' }] };
		const confirmarImportacion = vi.fn(() => of(resultado));
		const { facade } = crear({ vistaPreviaImportacion: () => of(vp(2)), confirmarImportacion });
		await facade.leerArchivo(archivo());

		facade.confirmar();

		const payload = (confirmarImportacion.mock.calls as unknown as [{ filasEsperadas: number }][])[0][0];
		expect(payload.filasEsperadas).toBe(2);
		expect(facade.resultado()).toEqual(resultado);
		expect(facade.vistaPrevia()).toBeNull();
		expect(facade.puedeConfirmar()).toBe(false);
	});

	it('no confirma si no hay filas aplicables', async () => {
		const confirmarImportacion = vi.fn();
		const { facade } = crear({ vistaPreviaImportacion: () => of(vp(0)), confirmarImportacion });
		await facade.leerArchivo(archivo());

		facade.confirmar();

		expect(confirmarImportacion).not.toHaveBeenCalled();
	});

	it('un 409 recalcula la vista previa con el número nuevo y avisa; no deja resultado', async () => {
		const vistaPreviaImportacion = vi.fn().mockReturnValueOnce(of(vp(2))).mockReturnValueOnce(of(vp(1)));
		const confirmarImportacion = vi.fn(() =>
			throwError(() => ({ status: 409, error: { errorCode: 'IMPORTACION_VISTA_PREVIA_DESACTUALIZADA' } })),
		);
		const { facade } = crear({ vistaPreviaImportacion, confirmarImportacion });
		await facade.leerArchivo(archivo());

		facade.confirmar();

		expect(vistaPreviaImportacion).toHaveBeenCalledTimes(2);
		expect(facade.vistaPrevia()?.aplicables).toBe(1);
		expect(facade.error()).toContain('Los datos cambiaron');
		expect(facade.resultado()).toBeNull();
		expect(facade.confirmando()).toBe(false);
	});

	it('un 4xx distinto de 409 no se reintenta ni recalcula', async () => {
		const vistaPreviaImportacion = vi.fn(() => of(vp(2)));
		const confirmarImportacion = vi.fn(() => throwError(() => ({ status: 400, error: { errorCode: 'IMPORTACION_EXCEDE_LIMITE' } })));
		const { facade } = crear({ vistaPreviaImportacion, confirmarImportacion });
		await facade.leerArchivo(archivo());

		facade.confirmar();

		expect(vistaPreviaImportacion).toHaveBeenCalledOnce();
		expect(confirmarImportacion).toHaveBeenCalledOnce();
		expect(facade.error()).toContain('3000');
	});

	it('sin respuesta del servidor recalcula: si ya se aplicó, las filas saldrán «ya existe»', async () => {
		const vistaPreviaImportacion = vi.fn().mockReturnValueOnce(of(vp(2))).mockReturnValueOnce(of(vp(0)));
		const { facade } = crear({ vistaPreviaImportacion, confirmarImportacion: () => throwError(() => ({ status: 0 })) });
		await facade.leerArchivo(archivo());

		facade.confirmar();

		expect(vistaPreviaImportacion).toHaveBeenCalledTimes(2);
		expect(facade.vistaPrevia()?.aplicables).toBe(0);
		expect(facade.error()).toContain('No hubo respuesta');
	});

	it('no manda una segunda confirmación mientras la primera está en vuelo', async () => {
		const confirmarImportacion = vi.fn(() => NEVER);
		const { facade } = crear({ vistaPreviaImportacion: () => of(vp(2)), confirmarImportacion });
		await facade.leerArchivo(archivo());

		facade.confirmar();
		facade.confirmar();

		expect(confirmarImportacion).toHaveBeenCalledOnce();
		expect(facade.confirmando()).toBe(true);
	});

	it('cambiar el año recalcula y descarta el resultado anterior', async () => {
		const vistaPreviaImportacion = vi.fn(() => of(vp(2)));
		const { facade } = crear({ vistaPreviaImportacion, confirmarImportacion: () => of({ saldosConfirmados: 2, pagos: 0, descuentos: 0, fallidas: [] }) });
		await facade.leerArchivo(archivo());
		facade.confirmar();

		facade.cambiarAnio(2027);

		expect(facade.resultado()).toBeNull();
		const ultimo = (vistaPreviaImportacion.mock.calls as unknown as [{ anio: number }][]).at(-1)?.[0];
		expect(ultimo?.anio).toBe(2027);
	});

	it('descarga la plantilla con las 17 columnas y sin UTILES entre los ejemplos', () => {
		const { facade, excel } = crear({});

		facade.descargarPlantilla();

		const config = (excel.exportToXlsx.mock.calls as unknown as [{ sheetName: string; columns: unknown[]; data: Record<string, string>[]; fileName: string }][])[0][0];
		expect(config.sheetName).toBe('Datos');
		expect(config.columns).toHaveLength(17);
		expect(config.data.some((f) => f['concepto'] === 'UTILES')).toBe(false);
		expect(config.fileName).toMatch(/\.xlsx$/);
	});
});
