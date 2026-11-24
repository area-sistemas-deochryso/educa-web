import { describe, expect, it } from 'vitest';

import type { ConceptoConMontos, MontoConcepto, NivelEducativo } from '@data/models';

import {
	type BorradorMontos,
	type CeldaMonto,
	type FilaConcepto,
	armarPayloadMontos,
	ayudaConcepto,
	cambiosMontos,
	cantidadErroresMontos,
	claveMonto,
	coberturaMontos,
	conTexto,
	filasMontos,
	hayCambiosMontos,
	leerMonto,
	motivoNoRevisarMontos,
	nombreConcepto,
	textoDeCentavos,
} from './montos-anio.logic';

// #region Datos
/** El BE omite los nulos del JSON: sin `nivel` es «Todos los niveles». */
function monto(
	conceptoId: number,
	valor: number,
	rowVersion: string,
	nivel?: NivelEducativo,
): MontoConcepto {
	return nivel
		? { conceptoId, nivel, monto: valor, rowVersion }
		: { conceptoId, monto: valor, rowVersion };
}

const matricula = (montos: MontoConcepto[] = []): ConceptoConMontos => ({
	conceptoId: 1,
	codigo: 'MATRICULA',
	nombre: 'Matricula',
	soloAlumnosNuevos: false,
	montos,
});
const inscripcion = (montos: MontoConcepto[] = []): ConceptoConMontos => ({
	conceptoId: 2,
	codigo: 'INSCRIPCION',
	nombre: 'Inscripcion',
	soloAlumnosNuevos: true,
	montos,
});
const pension = (montos: MontoConcepto[] = []): ConceptoConMontos => ({
	conceptoId: 3,
	codigo: 'PENSION',
	nombre: 'Pension',
	soloAlumnosNuevos: false,
	montos,
});

/** Lo sembrado en TEST 2026: matrícula e inscripción para todos los niveles y pensión por nivel. */
const sembrado = (): ConceptoConMontos[] => [
	matricula([monto(1, 320, 'm1')]),
	inscripcion([monto(2, 150, 'i1')]),
	pension([
		monto(3, 280, 'p1', 'Inicial'),
		monto(3, 320, 'p2', 'Primaria'),
		monto(3, 320, 'p3', 'Secundaria'),
	]),
];

/** `formatSoles` separa «S/» con un espacio sin corte: se normaliza para comparar el texto entero. */
const plano = (texto: string | null): string => (texto ?? '').replace(/\s/g, ' ');

function celda(filas: FilaConcepto[], clave: string): CeldaMonto {
	const encontrada = filas.flatMap((f) => f.celdas).find((c) => c.clave === clave);
	if (!encontrada) throw new Error(`no existe la celda ${clave}`);
	return encontrada;
}
// #endregion

describe('montos-anio.logic · leerMonto', () => {
	it.each([
		['320', 32000],
		['320,5', 32050],
		['320.50', 32050],
		['S/ 320', 32000],
		['s/320', 32000],
		[' 320 ', 32000],
		['320.', 32000],
		['0,05', 5],
		['99999999.99', 9_999_999_999],
	])('lee «%s» como %i céntimos', (texto, centavos) => {
		expect(leerMonto(texto)).toEqual({ tipo: 'valido', centavos });
	});

	it('lo vacío o solo con espacios es «vacío», no un error', () => {
		expect(leerMonto('')).toEqual({ tipo: 'vacio' });
		expect(leerMonto('   ')).toEqual({ tipo: 'vacio' });
	});

	it.each([
		[
			'abc',
			'Escribe solo el número, con punto o coma para los céntimos (por ejemplo, 320.50).',
		],
		[
			'1,234.50',
			'Escribe solo el número, con punto o coma para los céntimos (por ejemplo, 320.50).',
		],
		[
			'1 234',
			'Escribe solo el número, con punto o coma para los céntimos (por ejemplo, 320.50).',
		],
		[
			'1,234',
			'Usa como máximo dos decimales y no escribas separador de miles (por ejemplo, 1234.50).',
		],
		[
			'320.555',
			'Usa como máximo dos decimales y no escribas separador de miles (por ejemplo, 1234.50).',
		],
		['0', 'El monto debe ser mayor que S/ 0.00.'],
		['0,00', 'El monto debe ser mayor que S/ 0.00.'],
		['-5', 'El monto debe ser mayor que S/ 0.00.'],
		['100000000', 'El monto no puede pasar de S/ 99,999,999.99.'],
	])('rechaza «%s» explicando la regla (INV-PG06)', (texto, error) => {
		expect(leerMonto(texto)).toEqual({ tipo: 'invalido', error });
	});
});

describe('montos-anio.logic · claves y nombres', () => {
	it('el nivel ausente del JSON y el null dan la misma clave', () => {
		expect(claveMonto(1, undefined)).toBe(claveMonto(1, null));
		expect(claveMonto(3, 'Primaria')).toBe('3|Primaria');
	});

	it('muestra los nombres con tildes y conserva los desconocidos', () => {
		expect(nombreConcepto({ codigo: 'INSCRIPCION', nombre: 'Inscripcion' })).toBe(
			'Inscripción',
		);
		expect(nombreConcepto({ codigo: 'UTILES', nombre: 'Utiles' })).toBe('Utiles');
	});

	it('explica cada concepto conocido', () => {
		expect(ayudaConcepto('PENSION')).toContain('10 cuotas');
		expect(ayudaConcepto('INSCRIPCION')).toContain('alumnos nuevos');
		expect(ayudaConcepto('UTILES')).toBeNull();
	});

	it('textoDeCentavos escribe siempre 2 decimales', () => {
		expect(textoDeCentavos(32050)).toBe('320.50');
		expect(textoDeCentavos(5)).toBe('0.05');
	});
});

describe('montos-anio.logic · filasMontos', () => {
	it('respeta el orden del servidor y arma 4 celdas por concepto: Todos, Inicial, Primaria, Secundaria', () => {
		const filas = filasMontos([pension(), matricula()], {});

		expect(filas.map((f) => f.codigo)).toEqual(['PENSION', 'MATRICULA']);
		expect(filas[0].celdas.map((c) => c.nivel)).toEqual([
			null,
			'Inicial',
			'Primaria',
			'Secundaria',
		]);
		expect(filas[0].celdas.map((c) => c.etiqueta)).toEqual([
			'Todos los niveles (S/)',
			'Inicial (S/)',
			'Primaria (S/)',
			'Secundaria (S/)',
		]);
		expect(filas[0].celdas[1].inputId).toBe('monto-3-Inicial');
		expect(filas[0].celdas[1].ayudaId).toBe('monto-3-Inicial-ayuda');
	});

	it('un nivel ausente en el JSON se lee como «Todos los niveles» y el texto sale de lo guardado', () => {
		const todos = celda(filasMontos(sembrado(), {}), '1|todos');

		expect(todos.texto).toBe('320.00');
		expect(todos.textoBase).toBe('320.00');
		expect(todos.guardado).toEqual({ centavos: 32000, rowVersion: 'm1' });
		expect(todos.cambiada).toBe(false);
		expect(todos.mensaje).toBeNull();
	});

	it('vaciar un monto guardado es un error: la API no borra montos (INV-PG06)', () => {
		const vaciada = celda(filasMontos(sembrado(), { '1|todos': '' }), '1|todos');

		expect(vaciada.error).toBe(
			'Este monto ya está guardado y no se puede quitar: escribe el valor que corresponde.',
		);
		expect(vaciada.esError).toBe(true);
		expect(vaciada.cambiada).toBe(true);
		expect(vaciada.centavos).toBeNull();
	});

	it('dejar vacía una celda sin monto guardado no es un error ni un cambio', () => {
		const vacia = celda(filasMontos(sembrado(), { '1|Inicial': '  ' }), '1|Inicial');

		expect(vacia.error).toBeNull();
		expect(vacia.cambiada).toBe(false);
		expect(vacia.centavos).toBeNull();
	});

	it('lo inválido marca la celda con su error y cuenta como cambio', () => {
		const invalida = celda(filasMontos(sembrado(), { '2|todos': '0' }), '2|todos');

		expect(invalida.error).toBe('El monto debe ser mayor que S/ 0.00.');
		expect(invalida.mensaje).toBe(invalida.error);
		expect(invalida.cambiada).toBe(true);
		expect(invalida.centavos).toBeNull();
	});

	it('el eco del monto leído dice «por cuota» solo en Pensión', () => {
		const filas = filasMontos(sembrado(), { '1|todos': '330,5', '3|Inicial': '290' });

		expect(plano(celda(filas, '1|todos').mensaje)).toBe('= S/ 330.50');
		expect(plano(celda(filas, '3|Inicial').mensaje)).toBe('= S/ 290.00 por cuota');
		expect(celda(filas, '1|todos').esError).toBe(false);
	});

	it('el mismo valor con otro formato no es un cambio', () => {
		const igual = celda(filasMontos(sembrado(), { '1|todos': '320' }), '1|todos');

		expect(igual.cambiada).toBe(false);
		expect(igual.centavos).toBe(32000);
		expect(igual.texto).toBe('320');
	});

	it('trae la ayuda y la marca de solo alumnos nuevos', () => {
		const [mat, ins] = filasMontos(sembrado(), {});

		expect(ins.soloAlumnosNuevos).toBe(true);
		expect(ins.nombre).toBe('Inscripción');
		expect(mat.ayuda).toBe('Se cobra una vez al año a cada alumno matriculado.');
		expect(mat.porCuota).toBe(false);
	});
});

describe('montos-anio.logic · qué se cobra', () => {
	const seCobra = (conceptos: ConceptoConMontos[], borrador: BorradorMontos = {}): string =>
		plano(filasMontos(conceptos, borrador)[0].seCobra);

	it('el monto del nivel gana sobre «Todos los niveles»', () => {
		const conceptos = [matricula([monto(1, 320, 'm1'), monto(1, 300, 'm2', 'Inicial')])];

		expect(seCobra(conceptos)).toBe(
			'Se cobra: Inicial S/ 300.00 · Primaria S/ 320.00 · Secundaria S/ 320.00',
		);
	});

	it('solo con el general se cobra en todos los niveles', () => {
		expect(seCobra([matricula([monto(1, 320, 'm1')])])).toBe(
			'Se cobra S/ 320.00 en todos los niveles.',
		);
		expect(seCobra([pension([monto(3, 320, 'p1')])])).toBe(
			'Se cobra S/ 320.00 por cuota en todos los niveles.',
		);
	});

	it('nombra el nivel que queda sin monto', () => {
		const conceptos = [
			pension([monto(3, 280, 'p1', 'Inicial'), monto(3, 320, 'p2', 'Primaria')]),
		];
		const fila = filasMontos(conceptos, {})[0];

		expect(plano(fila.seCobra)).toBe(
			'Se cobra por cuota: Inicial S/ 280.00 · Primaria S/ 320.00 · Secundaria sin monto',
		);
	});

	it('sin ningún monto el cargo no se genera', () => {
		const fila = filasMontos([inscripcion()], {})[0];

		expect(fila.seCobra).toBe('Sin monto: este cargo no se generará.');
	});

	it('usa lo escrito si es válido', () => {
		expect(seCobra([inscripcion()], { '2|todos': '150' })).toBe(
			'Se cobra S/ 150.00 en todos los niveles.',
		);
	});
});

describe('montos-anio.logic · borrador y cambios', () => {
	it('volver exactamente al valor base quita la clave; otro texto, incluso vacío, se conserva', () => {
		const base = celda(filasMontos(sembrado(), {}), '1|todos');
		const tocado = conTexto({}, base, '330');

		expect(tocado).toEqual({ '1|todos': '330' });
		expect(conTexto(tocado, base, '320.00')).toEqual({});
		expect(conTexto(tocado, base, '')).toEqual({ '1|todos': '' });
	});

	it('cambiosMontos incluye solo lo válido, cambiado y con valor', () => {
		const filas = filasMontos(sembrado(), {
			'1|todos': '320',
			'2|todos': 'abc',
			'3|Secundaria': '350',
			'3|todos': '300',
			'1|Inicial': '',
		});

		expect(cambiosMontos(filas)).toEqual([
			{
				clave: '3|todos',
				conceptoId: 3,
				codigo: 'PENSION',
				concepto: 'Pensión',
				nivel: null,
				nivelEtiqueta: 'Todos los niveles',
				antesCentavos: null,
				ahoraCentavos: 30000,
				rowVersion: null,
			},
			{
				clave: '3|Secundaria',
				conceptoId: 3,
				codigo: 'PENSION',
				concepto: 'Pensión',
				nivel: 'Secundaria',
				nivelEtiqueta: 'Secundaria',
				antesCentavos: 32000,
				ahoraCentavos: 35000,
				rowVersion: 'p3',
			},
		]);
	});

	it('el payload lleva rowVersion null al crear y el guardado al editar, nunca vacío (INV-S05)', () => {
		const filas = filasMontos(sembrado(), { '3|todos': '300', '3|Secundaria': '350' });
		const payload = armarPayloadMontos(2027, cambiosMontos(filas));

		expect(payload).toEqual({
			anio: 2027,
			montos: [
				{ conceptoId: 3, nivel: null, monto: 300, rowVersion: null },
				{ conceptoId: 3, nivel: 'Secundaria', monto: 350, rowVersion: 'p3' },
			],
		});
		expect(payload.montos.every((m) => m.rowVersion !== '')).toBe(true);
	});

	it('«0,30» viaja como 0.3 exacto, sin ruido de coma flotante', () => {
		const payload = armarPayloadMontos(
			2027,
			cambiosMontos(filasMontos([inscripcion()], { '2|todos': '0,30' })),
		);

		expect(JSON.stringify(payload)).toBe(
			'{"anio":2027,"montos":[{"conceptoId":2,"nivel":null,"monto":0.3,"rowVersion":null}]}',
		);
	});

	it('cuenta errores y cambios sin guardar, incluidas las celdas inválidas y vaciadas', () => {
		const limpias = filasMontos(sembrado(), { '1|todos': '320' });
		const conErrores = filasMontos(sembrado(), { '1|todos': '', '2|todos': 'abc' });

		expect(hayCambiosMontos(limpias)).toBe(false);
		expect(cantidadErroresMontos(limpias)).toBe(0);
		expect(hayCambiosMontos(conErrores)).toBe(true);
		expect(cantidadErroresMontos(conErrores)).toBe(2);
	});

	it('explica por qué no se puede revisar', () => {
		expect(motivoNoRevisarMontos(0, true)).toBe(
			'Vuelve a leer los montos antes de guardar: no se pudo confirmar qué quedó guardado.',
		);
		expect(motivoNoRevisarMontos(1, false)).toBe(
			'Corrige el monto marcado para revisar los cambios.',
		);
		expect(motivoNoRevisarMontos(3, false)).toBe(
			'Corrige los 3 montos marcados para revisar los cambios.',
		);
		expect(motivoNoRevisarMontos(0, false)).toBeNull();
	});
});

describe('montos-anio.logic · cobertura de lo guardado', () => {
	it('un año sin montos está vacío', () => {
		expect(coberturaMontos([matricula(), inscripcion(), pension()])).toEqual({
			vacia: true,
			completa: false,
			faltantes: ['Matrícula', 'Inscripción', 'Pensión'],
		});
	});

	it('nombra los conceptos y niveles que faltan', () => {
		const conceptos = [
			matricula([monto(1, 320, 'm1')]),
			inscripcion(),
			pension([monto(3, 280, 'p1', 'Inicial')]),
		];

		expect(coberturaMontos(conceptos)).toEqual({
			vacia: false,
			completa: false,
			faltantes: ['Inscripción', 'Pensión (Primaria y Secundaria)'],
		});
	});

	it('con todo cubierto está completa', () => {
		expect(coberturaMontos(sembrado())).toEqual({
			vacia: false,
			completa: true,
			faltantes: [],
		});
	});

	it('sin conceptos no está completa', () => {
		expect(coberturaMontos([]).completa).toBe(false);
	});
});
