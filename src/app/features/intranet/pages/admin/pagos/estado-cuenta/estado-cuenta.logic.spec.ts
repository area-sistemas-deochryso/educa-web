import { describe, expect, it } from 'vitest';

import type { CuentaCargo, CuentaPago } from '@data/models';
import {
	coberturaDePago,
	conceptoDe,
	detalleAnulacion,
	detalleDePago,
	montoPagoDe,
	ordenar,
	recargoDe,
	saldoDe,
	siguienteOrden,
} from './estado-cuenta.logic';
import { formatSoles as sol } from '../utils/pagos-format.util';

function cargo(parcial: Partial<CuentaCargo>): CuentaCargo {
	return {
		cargoId: 1,
		concepto: 'Pensión',
		cuota: 'Marzo',
		anio: 2026,
		vencimiento: '2026-03-31T00:00:00',
		fueraDeFechaDesde: null,
		montoBase: 500,
		ajuste: 0,
		pagadoBase: 0,
		pagadoRecargo: 0,
		recargo: 0,
		recargoCongelado: false,
		recargoOrigen: 'Ninguno',
		saldo: 500,
		estado: 'Pendiente',
		datoConfirmado: true,
		anioSinParametros: false,
		...parcial,
	};
}

describe('estado-cuenta.logic — cargo «sin dato» (INV-PG14)', () => {
	it('nunca muestra saldo ni recargo, aunque el servidor mande números', () => {
		const sinDato = cargo({ estado: 'SinDato', datoConfirmado: false, saldo: 500, recargo: 20 });

		expect(saldoDe(sinDato)).toBe('—');
		expect(recargoDe(sinDato)).toBe('—');
	});

	it('un cargo con dato sí muestra su saldo y su recargo en soles', () => {
		const conDato = cargo({ estado: 'Vencida', saldo: 500, recargo: 20 });

		expect(saldoDe(conDato)).toContain('500.00');
		expect(recargoDe(conDato)).toContain('20.00');
	});
});

describe('estado-cuenta.logic — pagos y anulaciones', () => {
	const anulado = {
		vigente: false,
		motivoAnulacion: 'Pago duplicado',
		usuarioAnulacion: 'admin',
		fechaAnulacion: '2026-11-08T10:00:00',
	};

	it('un registro anulado explica quién, cuándo y por qué', () => {
		const texto = detalleAnulacion(anulado);

		expect(texto).toContain('por admin');
		expect(texto).toContain('08/11/2026');
		expect(texto).toContain('Pago duplicado');
	});

	it('un registro vigente no lleva detalle', () => {
		expect(detalleAnulacion({ ...anulado, vigente: true })).toBe('');
	});

	it('un pago de familia aclara la parte de este alumno; uno propio no', () => {
		const base = { monto: 800, montoAplicadoAlumno: 800 } as CuentaPago;

		expect(montoPagoDe(base)).not.toContain('de este alumno');
		expect(montoPagoDe({ ...base, montoAplicadoAlumno: 500 })).toContain('de este alumno');
	});
});

describe('estado-cuenta.logic — qué cubrió un pago', () => {
	const cargos = [
		cargo({ cargoId: 1, concepto: 'Pensión', cuota: 'Septiembre' }),
		cargo({ cargoId: 2, concepto: 'Matrícula', cuota: null }),
	];
	const pagoCon = (parcial: Partial<CuentaPago>): CuentaPago => ({ monto: 0, montoAplicadoAlumno: 0, aplicaciones: [], ...parcial }) as CuentaPago;

	it('nombra el concepto con su cuota, o solo el concepto si no tiene cuota', () => {
		expect(conceptoDe(cargos[0])).toBe('Pensión · Septiembre');
		expect(conceptoDe(cargos[1])).toBe('Matrícula');
	});

	it('nombra cada cargo cubierto con su monto y deja el recargo aparte solo si hubo', () => {
		const pago = pagoCon({
			monto: 395,
			montoAplicadoAlumno: 395,
			aplicaciones: [
				{ cargoId: 1, montoBase: 320, montoRecargo: 5 },
				{ cargoId: 2, montoBase: 70, montoRecargo: 0 },
			],
		});

		expect(coberturaDePago(pago, cargos)).toEqual([
			`Cubrió: Pensión · Septiembre ${sol(320)} + ${sol(5)} de recargo; Matrícula ${sol(70)}.`,
		]);
	});

	it('en un pago de familia cuantifica lo que fue a otro alumno, sin inventar su nombre', () => {
		const pago = pagoCon({
			monto: 425,
			montoAplicadoAlumno: 325,
			aplicaciones: [{ cargoId: 1, montoBase: 320, montoRecargo: 5 }],
		});

		const lineas = coberturaDePago(pago, cargos);
		expect(lineas).toHaveLength(2);
		expect(lineas[1]).toBe(`El resto (${sol(100)}) cubrió a otro alumno.`);
	});

	it('el resto se calcula en centavos: 0.1 + 0.2 no deja un sobrante fantasma', () => {
		const pago = pagoCon({ monto: 0.3, montoAplicadoAlumno: 0.1 + 0.2, aplicaciones: [{ cargoId: 1, montoBase: 0.3, montoRecargo: 0 }] });

		expect(coberturaDePago(pago, cargos).some((l) => l.includes('otro alumno'))).toBe(false);
	});

	it('un cargo que no está en la cuenta se nombra por su número en vez de romperse', () => {
		const pago = pagoCon({ monto: 50, montoAplicadoAlumno: 50, aplicaciones: [{ cargoId: 99, montoBase: 50, montoRecargo: 0 }] });

		expect(coberturaDePago(pago, cargos)).toEqual([`Cubrió: Cargo 99 ${sol(50)}.`]);
	});

	it('un pago sin aplicaciones propias no inventa un «Cubrió:»', () => {
		expect(coberturaDePago(pagoCon({ monto: 0, montoAplicadoAlumno: 0 }), cargos)).toEqual([]);
	});

	it('el detalle de la fila junta lo que cubrió y, si está anulado, quién y por qué', () => {
		const pago = pagoCon({
			monto: 320,
			montoAplicadoAlumno: 320,
			aplicaciones: [{ cargoId: 1, montoBase: 320, montoRecargo: 0 }],
			vigente: false,
			motivoAnulacion: 'Pago duplicado',
			usuarioAnulacion: 'admin',
			fechaAnulacion: '2026-11-08T10:00:00',
		});

		const texto = detalleDePago(pago, cargos);
		expect(texto).toContain(`Cubrió: Pensión · Septiembre ${sol(320)}.`);
		expect(texto).toContain('Anulado por admin');
		expect(texto).toContain('Pago duplicado');
	});

	it('un pago vigente solo muestra lo que cubrió, sin texto de anulación', () => {
		const pago = pagoCon({ monto: 320, montoAplicadoAlumno: 320, vigente: true, aplicaciones: [{ cargoId: 1, montoBase: 320, montoRecargo: 0 }] });

		expect(detalleDePago(pago, cargos)).toBe(`Cubrió: Pensión · Septiembre ${sol(320)}.`);
	});
});

describe('estado-cuenta.logic — orden en cliente', () => {
	const filas = [{ n: 3 }, { n: 1 }, { n: null }, { n: 2 }];
	const valor = (f: { n: number | null }): number | null => f.n;

	it('alterna ascendente, descendente y sin orden', () => {
		const asc = siguienteOrden(null, 'n');
		const desc = siguienteOrden(asc, 'n');
		const ninguno = siguienteOrden(desc, 'n');

		expect(asc).toEqual({ key: 'n', descendente: false });
		expect(desc).toEqual({ key: 'n', descendente: true });
		expect(ninguno).toBeNull();
	});

	it('ordena sin tocar el arreglo original y deja los vacíos al final en ambos sentidos', () => {
		const asc = ordenar(filas, { key: 'n', descendente: false }, valor).map((f) => f.n);
		const desc = ordenar(filas, { key: 'n', descendente: true }, valor).map((f) => f.n);

		expect(asc).toEqual([1, 2, 3, null]);
		expect(desc).toEqual([3, 2, 1, null]);
		expect(filas.map((f) => f.n)).toEqual([3, 1, null, 2]);
	});

	it('sin orden respeta el del servidor', () => {
		expect(ordenar(filas, null, valor)).toEqual(filas);
	});
});
