import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { VistaPreviaGeneracion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { MatriculaOfertaFacade } from './matricula-oferta.facade';

const vistaPrevia = (aCrear: number, extra: Partial<VistaPreviaGeneracion> = {}): VistaPreviaGeneracion => ({
	anio: 2027,
	aCrear,
	yaExisten: 0,
	nacenSinDato: 0,
	nacenConfirmados: aCrear,
	porConcepto: [],
	omitidos: [],
	...extra,
});

function crear(api: Record<string, unknown>) {
	TestBed.configureTestingModule({ providers: [MatriculaOfertaFacade, { provide: PagosApiService, useValue: api }] });
	return TestBed.inject(MatriculaOfertaFacade);
}

describe('MatriculaOfertaFacade', () => {
	it('al iniciar calcula la vista previa del alumno, como no nuevo, sin escribir nada', () => {
		const vistaPreviaGeneracionAlumno = vi.fn(() => of(vistaPrevia(1)));
		const generarCargosAlumno = vi.fn();
		const facade = crear({ vistaPreviaGeneracionAlumno, generarCargosAlumno });

		facade.iniciar(15, 2027);

		expect(vistaPreviaGeneracionAlumno).toHaveBeenCalledWith({ anio: 2027, estudianteId: 15, esNuevo: false });
		expect(facade.vistaPrevia()?.aCrear).toBe(1);
		expect(generarCargosAlumno).not.toHaveBeenCalled();
	});

	it('marcar «alumno nuevo» recalcula la vista previa con esNuevo = true', () => {
		const vistaPreviaGeneracionAlumno = vi.fn((p: { esNuevo: boolean }) => of(vistaPrevia(p.esNuevo ? 2 : 1)));
		const facade = crear({ vistaPreviaGeneracionAlumno });
		facade.iniciar(15, 2027);

		facade.cambiarNuevo(true);

		expect(vistaPreviaGeneracionAlumno).toHaveBeenLastCalledWith({ anio: 2027, estudianteId: 15, esNuevo: true });
		expect(facade.vistaPrevia()?.aCrear).toBe(2);
	});

	it('genera con crearEsperados igual al conteo de la vista previa y deja el resultado', () => {
		const generarCargosAlumno = vi.fn(() => of({ anio: 2027, creados: 2, yaExisten: 0 }));
		const facade = crear({ vistaPreviaGeneracionAlumno: () => of(vistaPrevia(2)), generarCargosAlumno });
		facade.iniciar(15, 2027);
		facade.cambiarNuevo(true);

		facade.generar();

		expect(generarCargosAlumno).toHaveBeenCalledWith({ anio: 2027, estudianteId: 15, esNuevo: true }, 2);
		expect(facade.resultado()).toEqual({ anio: 2027, creados: 2, yaExisten: 0 });
		expect(facade.vistaPrevia()).toBeNull();
	});

	it('sin cargos a crear (todo ya existe) no genera: repetir no duplica', () => {
		const generarCargosAlumno = vi.fn();
		const facade = crear({ vistaPreviaGeneracionAlumno: () => of(vistaPrevia(0, { yaExisten: 1 })), generarCargosAlumno });
		facade.iniciar(15, 2027);

		facade.generar();

		expect(generarCargosAlumno).not.toHaveBeenCalled();
	});

	it('un 409 por vista previa desactualizada recalcula y conserva el aviso, sin dejar resultado', () => {
		const vistaPreviaGeneracionAlumno = vi.fn(() => of(vistaPrevia(2)));
		const generarCargosAlumno = vi.fn(() =>
			throwError(() => ({ status: 409, error: { errorCode: 'CARGO_GENERACION_VISTA_PREVIA_DESACTUALIZADA' } })),
		);
		const facade = crear({ vistaPreviaGeneracionAlumno, generarCargosAlumno });
		facade.iniciar(15, 2027);

		facade.generar();

		expect(vistaPreviaGeneracionAlumno).toHaveBeenCalledTimes(2);
		expect(facade.error()).toContain('Se recalculó');
		expect(facade.resultado()).toBeNull();
		expect(facade.generando()).toBe(false);
	});

	it('un error de la vista previa se muestra en línea y no deja vista previa', () => {
		const facade = crear({ vistaPreviaGeneracionAlumno: () => throwError(() => ({ status: 500 })) });

		facade.iniciar(15, 2027);

		expect(facade.vistaPrevia()).toBeNull();
		expect(facade.error()).toBe('No se pudo calcular la vista previa.');
	});

	it('quedaSinCargo refleja el aviso del BE y, si la consulta falla, calla (es solo un aviso)', async () => {
		const ok = crear({
			vistaPreviaGeneracionAlumno: () => of(vistaPrevia(1)),
			matriculaSinCargo: () => of({ anio: 2027, estudianteId: 15, matriculado: true, tieneCargoMatricula: false, sinCargoMatricula: true }),
		});
		ok.iniciar(15, 2027);
		expect(await ok.quedaSinCargo()).toBe(true);

		TestBed.resetTestingModule();
		const falla = crear({
			vistaPreviaGeneracionAlumno: () => of(vistaPrevia(1)),
			matriculaSinCargo: () => throwError(() => ({ status: 500 })),
		});
		falla.iniciar(15, 2027);
		expect(await falla.quedaSinCargo()).toBe(false);
	});
});
