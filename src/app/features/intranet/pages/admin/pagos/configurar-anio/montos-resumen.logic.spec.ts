import { TimeoutError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import type { ConceptoConMontos } from '@data/models';

import type { CambioMonto } from './montos-anio.logic';
import {
	TEXTOS_MONTOS,
	armarRevisionMontos,
	borradorSobreConceptos,
	cantidadMontos,
	mensajeGuardadoMontos,
	mensajeTrasRelectura,
	relecturaConfirmaGuardado,
	resumenMontos,
} from './montos-resumen.logic';

// #region Datos
const nuevoGeneral: CambioMonto = {
	clave: '1|todos',
	conceptoId: 1,
	codigo: 'MATRICULA',
	concepto: 'Matrícula',
	nivel: null,
	nivelEtiqueta: 'Todos los niveles',
	antesCentavos: null,
	ahoraCentavos: 32000,
	rowVersion: null,
};
const nuevoPorNivel: CambioMonto = {
	clave: '3|Inicial',
	conceptoId: 3,
	codigo: 'PENSION',
	concepto: 'Pensión',
	nivel: 'Inicial',
	nivelEtiqueta: 'Inicial',
	antesCentavos: null,
	ahoraCentavos: 28000,
	rowVersion: null,
};
const cambioPension: CambioMonto = {
	clave: '3|Secundaria',
	conceptoId: 3,
	codigo: 'PENSION',
	concepto: 'Pensión',
	nivel: 'Secundaria',
	nivelEtiqueta: 'Secundaria',
	antesCentavos: 30000,
	ahoraCentavos: 32000,
	rowVersion: 'p3',
};

/** `formatSoles` separa «S/» con un espacio sin corte: se normaliza para comparar el texto entero. */
const plano = (texto: string): string => texto.replace(/\s/g, ' ');

const AVISO_COPIA =
	'Cada cargo copia el monto vigente al generarse: los cargos ya generados conservan su monto y estos valen para los que se generen desde ahora.';
const AVISO_NUEVO =
	'Un monto nuevo no se puede quitar después desde esta pantalla, solo cambiar su valor.';
const AVISO_PRIORIDAD =
	'El monto de un nivel tiene prioridad sobre «Todos los niveles» para ese nivel.';
// #endregion

describe('montos-resumen.logic · resumen antes de guardar (INV-PG06)', () => {
	it('titula con la cantidad de nuevos y de cambios', () => {
		expect(resumenMontos([nuevoGeneral, nuevoPorNivel, cambioPension]).titulo).toBe(
			'3 montos: 2 nuevos y 1 cambio',
		);
		expect(resumenMontos([cambioPension]).titulo).toBe('1 monto: 1 cambio');
		expect(resumenMontos([nuevoGeneral]).titulo).toBe('1 monto: 1 nuevo');
	});

	it('marca lo nuevo con «— (nuevo)» y muestra la pensión por cuota y por año', () => {
		const [general, pension] = resumenMontos([nuevoGeneral, cambioPension]).filas;

		expect(general).toMatchObject({
			concepto: 'Matrícula',
			nivel: 'Todos los niveles',
			antes: '— (nuevo)',
		});
		expect(plano(general.ahora)).toBe('S/ 320.00');
		expect(plano(pension.antes)).toBe('S/ 300.00 por cuota');
		expect(plano(pension.ahora)).toBe('S/ 320.00 por cuota (S/ 3,200.00 al año)');
	});

	it('avisa siempre que los cargos ya generados conservan su monto', () => {
		expect(resumenMontos([cambioPension]).avisos).toEqual([AVISO_COPIA]);
	});

	it('avisa que un monto nuevo no se puede quitar', () => {
		expect(resumenMontos([nuevoGeneral]).avisos).toEqual([AVISO_COPIA, AVISO_NUEVO]);
	});

	it('avisa que el monto de un nivel tiene prioridad cuando se crea uno', () => {
		expect(resumenMontos([nuevoPorNivel]).avisos).toEqual([
			AVISO_COPIA,
			AVISO_NUEVO,
			AVISO_PRIORIDAD,
		]);
	});

	it('la revisión congela el payload que se envía y nombra el botón con la cantidad', () => {
		const revision = armarRevisionMontos(2027, [nuevoGeneral, cambioPension]);

		expect(revision.payload).toEqual({
			anio: 2027,
			montos: [
				{ conceptoId: 1, nivel: null, monto: 320, rowVersion: null },
				{ conceptoId: 3, nivel: 'Secundaria', monto: 320, rowVersion: 'p3' },
			],
		});
		expect(revision.tituloRevision).toBe('Revisa los montos de 2027 antes de guardar');
		expect(revision.etiquetaGuardar).toBe('Guardar 2 montos');
		expect(revision.cantidad).toBe(2);
		expect(armarRevisionMontos(2027, [cambioPension]).etiquetaGuardar).toBe('Guardar 1 monto');
	});
});

describe('montos-resumen.logic · textos de resultado', () => {
	it('cuenta en singular y plural', () => {
		expect(cantidadMontos(1)).toBe('1 monto');
		expect(cantidadMontos(4)).toBe('4 montos');
	});

	it('el guardado recuerda que los cargos ya generados no cambian', () => {
		expect(mensajeGuardadoMontos(1)).toBe(
			'Se guardó 1 monto. Los cargos ya generados conservan su monto; los que se generen desde ahora usan este.',
		);
		expect(mensajeGuardadoMontos(3)).toBe(
			'Se guardaron 3 montos. Los cargos ya generados conservan su monto; los que se generen desde ahora usan estos.',
		);
	});

	it('ningún texto visible cita códigos INV ni pide recargar la pantalla', () => {
		const textos = [
			...Object.values(TEXTOS_MONTOS),
			mensajeGuardadoMontos(2),
			...resumenMontos([nuevoGeneral, nuevoPorNivel, cambioPension]).avisos,
			mensajeTrasRelectura(
				{ status: 400, error: { errorCode: 'PAGO_MONTO_CONCEPTO_INVALIDO' } },
				true,
				['Útiles'],
			)?.texto ?? '',
		];

		for (const texto of textos) expect(texto).not.toMatch(/INV-|recarg[aá] la pantalla/);
	});
});

describe('montos-resumen.logic · relectura con un concepto desactivado', () => {
	const concepto = (conceptoId: number, codigo: string, nombre: string): ConceptoConMontos => ({
		conceptoId,
		codigo,
		nombre,
		soloAlumnosNuevos: false,
		montos: [],
	});
	const matricula = concepto(1, 'MATRICULA', 'Matricula');
	const inscripcion = concepto(2, 'INSCRIPCION', 'Inscripcion');
	const pension = concepto(3, 'PENSION', 'Pension');

	it('quita lo escrito para el concepto que ya no viene y lo nombra', () => {
		const borrador = { '2|todos': '150', '3|Secundaria': '350' };

		expect(
			borradorSobreConceptos(
				borrador,
				[matricula, inscripcion, pension],
				[matricula, pension],
			),
		).toEqual({
			borrador: { '3|Secundaria': '350' },
			descartados: ['Inscripción'],
		});
	});

	it('si no se fue ningún concepto con borrador, el borrador queda igual', () => {
		const borrador = { '3|Secundaria': '350' };
		const resultado = borradorSobreConceptos(
			borrador,
			[matricula, inscripcion, pension],
			[pension],
		);

		expect(resultado.borrador).toBe(borrador);
		expect(resultado.descartados).toEqual([]);
	});
});

describe('montos-resumen.logic · después de releer (INV-S05)', () => {
	const conflicto = { status: 409, error: { errorCode: 'PAGO_MONTO_CONFLICTO' } };
	const conceptoInvalido = { status: 400, error: { errorCode: 'PAGO_MONTO_CONCEPTO_INVALIDO' } };

	it('sin diferencias tras un resultado incierto o un 409, lo escrito ya estaba guardado', () => {
		expect(relecturaConfirmaGuardado({ status: 0 }, true, false, [])).toBe(true);
		expect(relecturaConfirmaGuardado(new TimeoutError(), true, false, [])).toBe(true);
		expect(relecturaConfirmaGuardado({ status: 503 }, true, false, [])).toBe(true);
		expect(relecturaConfirmaGuardado(conflicto, true, false, [])).toBe(true);
		expect(relecturaConfirmaGuardado(null, true, false, [])).toBe(true);
	});

	it('con diferencias, o si algo se descartó, no confirma nada', () => {
		expect(relecturaConfirmaGuardado(conflicto, true, true, [])).toBe(false);
		expect(relecturaConfirmaGuardado({ status: 0 }, true, false, ['Útiles'])).toBe(false);
	});

	it('sin nada escrito antes de releer no confirma nada: no había qué guardar', () => {
		expect(relecturaConfirmaGuardado(null, false, false, [])).toBe(false);
		expect(relecturaConfirmaGuardado({ status: 0 }, false, false, [])).toBe(false);
	});

	it('tras un concepto desactivado nunca dice que ya está guardado: ese PUT se rechazó entero', () => {
		expect(relecturaConfirmaGuardado(conceptoInvalido, true, false, [])).toBe(false);
	});

	it('con diferencias muestra el mensaje del error, que ya describe el estado real', () => {
		expect(mensajeTrasRelectura(conflicto, true, [])).toEqual({
			severidad: 'danger',
			texto: 'Otra persona cambió los montos de este año mientras editabas. Se cargaron sus valores y tus cambios siguen en pantalla: revísalos y vuelve a guardar.',
		});
		expect(mensajeTrasRelectura({ status: 0 }, true, [])?.texto).toBe(
			'No hubo respuesta del servidor y los montos no quedaron guardados: tus cambios siguen en pantalla. Revísalos y vuelve a guardar.',
		);
	});

	it('tras «Volver a leer» con algo escrito pide revisar los cambios; sin nada escrito no dice nada', () => {
		expect(mensajeTrasRelectura(null, true, [])).toEqual({
			severidad: 'info',
			texto: TEXTOS_MONTOS.releidos,
		});
		expect(mensajeTrasRelectura(null, false, [])).toBeNull();
	});

	it('con un concepto desactivado da el mensaje del código y nombra lo descartado', () => {
		expect(mensajeTrasRelectura(conceptoInvalido, true, ['Inscripción'])?.texto).toBe(
			'Uno de los conceptos ya no existe o fue desactivado, así que no admite montos. Se recargó la lista de conceptos: revisa los montos y vuelve a guardar. Se descartaron los montos que escribiste para Inscripción.',
		);
	});
});
