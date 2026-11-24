import { describe, expect, it } from 'vitest';

import type { CuotaCronograma } from '@data/models';
import { type BorradorCronograma, filasCronograma, rellenarFechas } from './cronograma-anio.logic';
import { etiquetaSugerida, fechaSugerida } from './cronograma-fechas.logic';
import {
	TEXTOS_CRONOGRAMA,
	armarRevisionCronograma,
	mensajeGuardadoCronograma,
	resumenCronograma,
} from './cronograma-resumen.logic';

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** 2027 guardado con las fechas habituales: 03-31, 04-30, 05-31, 06-30, 07-15, 08-13, 09-30, 10-29, 11-30, 12-15. */
const guardado2027: CuotaCronograma[] = NUMEROS.map((n) => ({
	numero: n,
	etiqueta: etiquetaSugerida(n),
	fechaVencimiento: `${fechaSugerida(2027, n)}T00:00:00`,
	rowVersion: `v${n}`,
}));

const ANTES_DE_2027 = '2026-11-23';

const resumenEdicion = (borrador: BorradorCronograma, hoy = ANTES_DE_2027) =>
	resumenCronograma(2027, filasCronograma(2027, guardado2027, borrador), hoy);

const filasCreacion = () =>
	filasCronograma(2027, [], rellenarFechas(2027, filasCronograma(2027, [], {}), {}));

const AVISO_FECHAS_MOVIDAS =
	'Las cuotas de pensión ya generadas toman la fecha nueva: cambia su vencimiento, desde cuándo cobran recargo y quiénes figuran como deudores. El monto no cambia.';
const AVISO_ADELANTA =
	'Adelantar un vencimiento puede dejar fuera de plazo un pago que llegó a tiempo con la fecha anterior: esa cuota pasaría a tener recargo.';
const AVISO_ATRASA =
	'Atrasar un vencimiento quita el recargo de las cuotas impagas que todavía no lo tenían fijado.';
const AVISO_ETIQUETAS =
	'Las etiquetas nuevas se ven en el estado de cuenta, en «Quiénes deben» y al registrar pagos.';

describe('cronograma-resumen.logic · creación (INV-PG05)', () => {
	it('lista las 10 cuotas sin efecto, con el aviso de que las fechas mueven lo que se genere', () => {
		const resumen = resumenCronograma(2027, filasCreacion(), ANTES_DE_2027);

		expect(resumen.creacion).toBe(true);
		expect(resumen.cambiaFechas).toBe(false);
		expect(resumen.titulo).toBe('Se crean las 10 cuotas de 2027');
		expect(resumen.caption).toBe('Cuotas del cronograma');
		expect(resumen.textoSinCambio).toBeNull();
		expect(resumen.filas).toHaveLength(10);
		expect(resumen.filas[0]).toEqual({
			numero: 1,
			etiqueta: 'Marzo',
			etiquetaAntes: null,
			antes: null,
			ahora: 'miércoles 31/03/2027',
			efecto: null,
		});
		expect(resumen.avisos).toEqual([
			'Las cuotas de pensión que generes para 2027 vencerán en estas fechas. Puedes cambiarlas después, pero un cambio también mueve las cuotas ya generadas.',
		]);
	});

	it('la revisión de una creación guarda las 10 cuotas', () => {
		const revision = armarRevisionCronograma(2027, filasCreacion(), ANTES_DE_2027);

		expect(revision.creacion).toBe(true);
		expect(revision.tituloRevision).toBe('Revisa el cronograma de 2027 antes de guardar');
		expect(revision.etiquetaGuardar).toBe('Guardar las 10 cuotas');
		expect(revision.payload.cuotas).toHaveLength(10);
		expect(revision.payload.cuotas.every((c) => c.rowVersion === null)).toBe(true);
	});
});

describe('cronograma-resumen.logic · edición', () => {
	it('lista solo las cuotas cambiadas, con su efecto y lo que no cambia', () => {
		const resumen = resumenEdicion({
			1: { fecha: '2027-03-29' },
			4: { etiqueta: 'Junio (pensión)' },
			9: { fecha: '2027-12-01' },
		});

		expect(resumen.creacion).toBe(false);
		expect(resumen.cambiaFechas).toBe(true);
		expect(resumen.titulo).toBe('Cambian 3 cuotas');
		expect(resumen.caption).toBe('Cambios en el cronograma');
		expect(resumen.textoSinCambio).toBe('Las otras 7 cuotas no cambian.');
		expect(resumen.filas.map((f) => f.numero)).toEqual([1, 4, 9]);
		expect(resumen.filas[0]).toEqual({
			numero: 1,
			etiqueta: 'Marzo',
			etiquetaAntes: null,
			antes: 'miércoles 31/03/2027',
			ahora: 'lunes 29/03/2027',
			efecto: 'Se adelanta 2 días',
		});
		expect(resumen.filas[1]).toMatchObject({
			etiqueta: 'Junio (pensión)',
			etiquetaAntes: 'Junio',
			efecto: 'Cambia la etiqueta',
		});
		expect(resumen.filas[2].efecto).toBe('Se atrasa 1 día');
		expect(resumen.avisos).toEqual([AVISO_FECHAS_MOVIDAS, AVISO_ADELANTA, AVISO_ATRASA]);
	});

	it('si solo cambian etiquetas, avisa dónde se ven y no habla de fechas', () => {
		const resumen = resumenEdicion({ 2: { etiqueta: 'Abril (2.ª cuota)' } });

		expect(resumen.cambiaFechas).toBe(false);
		expect(resumen.titulo).toBe('Cambia 1 cuota');
		expect(resumen.textoSinCambio).toBe('Las otras 9 cuotas no cambian.');
		expect(resumen.avisos).toEqual([AVISO_ETIQUETAS]);
	});

	it('con 9 cuotas cambiadas dice que «la otra» no cambia', () => {
		const borrador = Object.fromEntries(
			NUMEROS.slice(0, 9).map((n) => [n, { etiqueta: `Cuota ${n}` }]),
		);

		const resumen = resumenEdicion(borrador);

		expect(resumen.titulo).toBe('Cambian 9 cuotas');
		expect(resumen.textoSinCambio).toBe('La otra cuota no cambia.');
	});

	it('avisa de las fechas que ya pasaron (la anterior o la nueva hasta hoy), nombrando las cuotas', () => {
		const hoy = '2027-04-30';

		const varias = resumenEdicion(
			{ 1: { fecha: '2027-03-30' }, 2: { fecha: '2027-05-03' }, 5: { fecha: '2027-07-14' } },
			hoy,
		);
		const una = resumenEdicion({ 5: { fecha: '2027-04-29' } }, hoy);

		expect(varias.avisos).toContain(
			'Hay cambios en fechas que ya pasaron (cuotas 1 y 2): afectan las deudas y los recargos de hoy.',
		);
		expect(una.avisos).toContain(
			'Hay cambios en fechas que ya pasaron (cuota 5): afectan las deudas y los recargos de hoy.',
		);
	});

	it('avisa que el año ya terminó si cambian sus fechas, pero no por cambiar solo etiquetas', () => {
		const fechas = resumenEdicion({ 10: { fecha: '2027-12-14' } }, '2028-01-10');
		const etiquetas = resumenEdicion({ 10: { etiqueta: 'Diciembre (fin)' } }, '2028-01-10');

		expect(fechas.avisos).toContain(
			'2027 ya terminó: los reportes de ese año pueden cambiar con las fechas nuevas.',
		);
		expect(fechas.avisos).toContain(
			'Hay cambios en fechas que ya pasaron (cuota 10): afectan las deudas y los recargos de hoy.',
		);
		expect(etiquetas.avisos).toEqual([AVISO_ETIQUETAS]);
	});

	it('la revisión de una edición tiene su propio título y botón', () => {
		const revision = armarRevisionCronograma(
			2027,
			filasCronograma(2027, guardado2027, { 1: { fecha: '2027-03-30' } }),
			ANTES_DE_2027,
		);

		expect(revision.creacion).toBe(false);
		expect(revision.tituloRevision).toBe('Revisa los cambios del cronograma de 2027');
		expect(revision.etiquetaGuardar).toBe('Guardar cambios del cronograma');
		expect(revision.payload.cuotas[0]).toMatchObject({
			fechaVencimiento: '2027-03-30',
			rowVersion: 'v1',
		});
	});
});

describe('cronograma-resumen.logic · mensajes', () => {
	it('el mensaje de guardado solo promete mover las cuotas generadas si cambió una fecha', () => {
		expect(mensajeGuardadoCronograma(true, 2027, false)).toBe(
			'Se guardó el cronograma de 2027: 10 cuotas.',
		);
		expect(mensajeGuardadoCronograma(false, 2027, true)).toBe(
			'Se guardaron los cambios del cronograma. Las cuotas ya generadas toman las fechas nuevas.',
		);
		expect(mensajeGuardadoCronograma(false, 2027, false)).toBe(
			'Se guardaron los cambios del cronograma.',
		);
	});

	it('ningún texto visible cita códigos de regla (U2)', () => {
		const textos = [
			...Object.values(TEXTOS_CRONOGRAMA),
			...resumenCronograma(2027, filasCreacion(), ANTES_DE_2027).avisos,
			...resumenEdicion(
				{ 1: { fecha: '2027-03-29' }, 9: { fecha: '2027-12-01' } },
				'2028-01-10',
			).avisos,
			...resumenEdicion({ 2: { etiqueta: 'Abril (2.ª cuota)' } }).avisos,
		];

		for (const texto of textos) expect(texto).not.toMatch(/INV-|recarg[aá] la pantalla/);
	});
});
