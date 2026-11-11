import { describe, expect, it } from 'vitest';

import type { FilaEvaluada } from '@data/models';
import {
	LIMITE_FILAS,
	type FilaHoja,
	type FilaLeida,
	armarFilasEnvio,
	armarFilasVista,
	conteoPorEstado,
	cuotaDe,
	dniDe,
	fechaDe,
	filtrarPorEstado,
	horaDe,
	leerFilas,
	montoDe,
	resumenResultado,
} from './importacion.logic';

/** Una fila de `parseXlsx`: SheetJS le agrega `__rowNum__` sin enumerarlo. */
function fila(celdas: Record<string, unknown>, rowNum?: number): FilaHoja {
	const f: FilaHoja = {
		DNI: '',
		Apellidos: '',
		Nombres: '',
		Grado: '',
		Salón: '',
		Concepto: '',
		Cuota: '',
		Tipo: '',
		Estado: '',
		Monto: '',
		Fecha: '',
		Medio: '',
		Comprobante: '',
		NumeroOperacion: '',
		BancoOrigen: '',
		Hora: '',
		Motivo: '',
		...celdas,
	};
	if (rowNum !== undefined) Object.defineProperty(f, '__rowNum__', { value: rowNum, enumerable: false });
	return f;
}

const leidas = (hoja: FilaHoja[]): FilaLeida[] => {
	const r = leerFilas(hoja);
	if (!r.ok) throw new Error(r.mensaje);
	return r.filas;
};

describe('fechaDe', () => {
	it('lee dd/mm/aaaa como fecha civil sin pasar por UTC', () => {
		expect(fechaDe('05/10/2026')).toBe('2026-10-05');
		expect(fechaDe('5-1-2026')).toBe('2026-01-05');
		expect(fechaDe('2026-10-05')).toBe('2026-10-05');
	});

	it('rechaza fechas que no existen en el calendario', () => {
		expect(fechaDe('31/02/2026')).toBeNull();
		expect(fechaDe('05/13/2026')).toBeNull();
		expect(fechaDe('ayer')).toBeNull();
	});

	it('acepta el serial de Excel (lo que llega cuando la persona tipea la fecha)', () => {
		// 46300 = 05/10/2026 en el calendario de Excel (base 30/12/1899).
		expect(fechaDe(46300)).toBe('2026-10-05');
		expect(fechaDe(46300.75)).toBe('2026-10-05');
	});

	it('una celda vacía no es error', () => {
		expect(fechaDe('')).toBeUndefined();
		expect(fechaDe('   ')).toBeUndefined();
	});
});

describe('horaDe', () => {
	it('normaliza HH:mm y recorta segundos', () => {
		expect(horaDe('9:05')).toBe('09:05');
		expect(horaDe('14:30:00')).toBe('14:30');
	});

	it('convierte la fracción de día de Excel', () => {
		expect(horaDe(0.5)).toBe('12:00');
		expect(horaDe(0.604166667)).toBe('14:30');
	});

	it('un texto que no reconoce se manda tal cual: el BE devuelve la regla', () => {
		expect(horaDe('tarde')).toBe('tarde');
		expect(horaDe('')).toBeUndefined();
	});
});

describe('montoDe, cuotaDe y dniDe', () => {
	it('lee montos con punto, coma decimal o prefijo de soles', () => {
		expect(montoDe(450)).toBe(450);
		expect(montoDe('450.00')).toBe(450);
		expect(montoDe('450,50')).toBe(450.5);
		expect(montoDe('S/ 1,200.50')).toBe(1200.5);
		expect(montoDe('')).toBeUndefined();
		expect(montoDe('abc')).toBeNull();
	});

	it('la cuota debe ser entera', () => {
		expect(cuotaDe('9')).toBe(9);
		expect(cuotaDe(10)).toBe(10);
		expect(cuotaDe('')).toBeUndefined();
		expect(cuotaDe('2.5')).toBeNull();
		expect(cuotaDe('x')).toBeNull();
	});

	it('un DNI que Excel guardó como número recupera los ceros de la izquierda', () => {
		expect(dniDe(7123456)).toBe('07123456');
		expect(dniDe('70123456')).toBe('70123456');
		expect(dniDe('')).toBeUndefined();
	});
});

describe('leerFilas', () => {
	it('usa __rowNum__ como número de fila de la hoja aunque haya filas en blanco entre medio', () => {
		const r = leidas([
			fila({ Concepto: 'MATRICULA', Tipo: 'SALDO', Estado: 'SALDADO', Apellidos: 'Quispe' }, 1),
			fila({ Concepto: 'PENSION', Tipo: 'SALDO', Estado: 'DEBE', Apellidos: 'Torres', Cuota: 9 }, 4),
		]);
		expect(r.map((f) => f.numero)).toEqual([2, 5]);
	});

	it('sin __rowNum__ cae al orden: la primera fila de datos es la 2', () => {
		const r = leidas([fila({ Concepto: 'MATRICULA', Tipo: 'SALDO' }), fila({ Concepto: 'PENSION', Tipo: 'SALDO' })]);
		expect(r.map((f) => f.numero)).toEqual([2, 3]);
	});

	it('ignora las filas totalmente en blanco', () => {
		const r = leidas([fila({ Concepto: 'MATRICULA', Tipo: 'SALDO' }, 1), fila({}, 2), fila({ Concepto: 'PENSION', Tipo: 'SALDO' }, 3)]);
		expect(r).toHaveLength(2);
	});

	it('arma el contrato: códigos en mayúsculas sin tildes, fecha ISO y campos vacíos omitidos', () => {
		const [f] = leidas([
			fila(
				{
					DNI: 70987654,
					Apellidos: ' Mamani Cruz ',
					Nombres: 'Rosa',
					Grado: '5.º Primaria',
					Concepto: 'Pensión',
					Cuota: '10',
					Tipo: 'pago',
					Monto: '450.00',
					Fecha: '05/10/2026',
					Medio: 'efectivo',
					Comprobante: 'S/N',
				},
				2,
			),
		]);
		expect(f.errorLocal).toBeNull();
		expect(f.fila).toEqual({
			numero: 3,
			dni: '70987654',
			apellidos: 'Mamani Cruz',
			nombres: 'Rosa',
			grado: '5.º Primaria',
			salon: undefined,
			concepto: 'PENSION',
			cuota: 10,
			tipo: 'PAGO',
			estado: undefined,
			monto: 450,
			fecha: '2026-10-05',
			medio: 'EFECTIVO',
			comprobante: 'S/N',
			numeroOperacion: undefined,
			bancoOrigen: undefined,
			hora: undefined,
			motivo: undefined,
		});
	});

	it('reconoce las cabeceras sin importar tildes ni mayúsculas', () => {
		const hoja: FilaHoja = { ' salon ': 'A', CONCEPTO: 'MATRICULA', tipo: 'SALDO' };
		const [f] = leidas([hoja]);
		expect(f.fila?.salon).toBe('A');
	});

	it('una fecha ilegible deja la fila fuera del envío con un error local', () => {
		const [f] = leidas([fila({ Concepto: 'PENSION', Tipo: 'PAGO', Monto: 10, Fecha: '31/02/2026' }, 1)]);
		expect(f.fila).toBeNull();
		expect(f.errorLocal).toContain('dd/mm/aaaa');
	});

	it('avisa cuando falta una columna obligatoria', () => {
		const r = leerFilas([{ DNI: '1', Nombres: 'x' }]);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.motivo).toBe('sin-columnas');
			expect(r.mensaje).toContain('Concepto');
		}
	});

	it('rechaza un archivo vacío o de solo filas en blanco', () => {
		expect(leerFilas([])).toMatchObject({ ok: false, motivo: 'vacio' });
		expect(leerFilas([fila({})])).toMatchObject({ ok: false, motivo: 'vacio' });
	});

	it(`rechaza más de ${LIMITE_FILAS} filas en vez de partirlas`, () => {
		const hoja = Array.from({ length: LIMITE_FILAS + 1 }, () => fila({ Concepto: 'PENSION', Tipo: 'SALDO' }));
		expect(leerFilas(hoja)).toMatchObject({ ok: false, motivo: 'excede-limite' });
		expect(leerFilas(hoja.slice(0, LIMITE_FILAS)).ok).toBe(true);
	});
});

describe('armarFilasEnvio', () => {
	const base = leidas([
		fila({ Concepto: 'PENSION', Tipo: 'SALDO', Estado: 'DEBE', Apellidos: 'A' }, 1),
		fila({ Concepto: 'PENSION', Tipo: 'PAGO', Monto: 1, Fecha: 'mala' }, 2),
		fila({ Concepto: 'PENSION', Tipo: 'SALDO', Estado: 'DEBE', Apellidos: 'B' }, 3),
		fila({ Concepto: 'PENSION', Tipo: 'SALDO', Estado: 'DEBE', Apellidos: 'C' }, 4),
	]);

	it('no manda las ilegibles ni las descartadas, y agrega el alumno elegido a mano', () => {
		const envio = armarFilasEnvio(base, { resueltas: new Map([[5, 99]]), descartadas: new Set([4]) });
		expect(envio.map((f) => f.numero)).toEqual([2, 5]);
		expect(envio.find((f) => f.numero === 2)?.estudianteId).toBeUndefined();
		expect(envio.find((f) => f.numero === 5)?.estudianteId).toBe(99);
	});
});

describe('armarFilasVista', () => {
	const base = leidas([
		fila({ Concepto: 'PENSION', Tipo: 'SALDO', Apellidos: 'Lista' }, 1),
		fila({ Concepto: 'PENSION', Tipo: 'PAGO', Monto: 1, Fecha: 'mala' }, 2),
		fila({ Concepto: 'PENSION', Tipo: 'SALDO', Apellidos: 'Ambigua' }, 3),
		fila({ Concepto: 'PENSION', Tipo: 'SALDO', Apellidos: 'Descartada' }, 4),
	]);
	const evaluadas: FilaEvaluada[] = [
		{ numero: 2, estado: 'LISTA', mensaje: null, estudianteId: 7, alumno: 'Lista Uno', cargoId: 1, candidatos: [] },
		{
			numero: 4,
			estado: 'SIN_RESOLVER',
			mensaje: 'Hay 2 alumnos con ese nombre.',
			estudianteId: null,
			alumno: null,
			cargoId: null,
			candidatos: [
				{ estudianteId: 11, nombre: 'Ambigua Uno', salon: '3.º A' },
				{ estudianteId: 12, nombre: 'Ambigua Dos', salon: null },
			],
		},
		{ numero: 5, estado: 'SIN_RESOLVER', mensaje: null, estudianteId: null, alumno: null, cargoId: null, candidatos: [] },
	];

	it('junta lo leído con la respuesta del BE y marca los estados que solo existen en el cliente', () => {
		const vista = armarFilasVista(base, evaluadas, new Set([5]));
		expect(vista.map((f) => [f.numero, f.estado])).toEqual([
			[2, 'LISTA'],
			[3, 'INVALIDA'],
			[4, 'SIN_RESOLVER'],
			[5, 'DESCARTADA'],
		]);
		expect(vista.find((f) => f.numero === 3)?.mensaje).toContain('dd/mm/aaaa');
		// «Lista Uno» no es lo que se escribió en la hoja («Lista»): se destaca.
		expect(vista.find((f) => f.numero === 2)?.alumnoResuelto).toBe('Lista Uno');
	});

	it('ofrece los candidatos con su salón como opciones del selector', () => {
		const vista = armarFilasVista(base, evaluadas, new Set());
		expect(vista.find((f) => f.numero === 4)?.candidatos).toEqual([
			{ value: 11, label: 'Ambigua Uno · 3.º A' },
			{ value: 12, label: 'Ambigua Dos' },
		]);
	});

	it('cuenta y filtra por estado', () => {
		const vista = armarFilasVista(base, evaluadas, new Set([5]));
		const conteo = conteoPorEstado(vista);
		expect(conteo.get('LISTA')).toBe(1);
		expect(conteo.get('DESCARTADA')).toBe(1);
		expect(filtrarPorEstado(vista, 'INVALIDA').map((f) => f.numero)).toEqual([3]);
		expect(filtrarPorEstado(vista, null)).toHaveLength(4);
	});
});

describe('resumenResultado', () => {
	it('concuerda singular y plural', () => {
		expect(resumenResultado({ saldosConfirmados: 1, pagos: 2, descuentos: 0 })).toBe('Se aplicaron 1 saldo, 2 pagos, 0 descuentos.');
	});
});
