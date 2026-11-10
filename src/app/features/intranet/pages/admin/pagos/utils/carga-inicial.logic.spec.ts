import { describe, expect, it } from 'vitest';

import {
	anioSinParametros,
	armarFiltroSinDato,
	armarPayloadConfirmacion,
	armarPayloadGeneracion,
	armarPayloadParametros,
	cantidadCargos,
	describirOmision,
	fechaDesdeIso,
	fechaInicialEnAnio,
	isoLocal,
	mensajeDeError,
	opcionesAnio,
	parametrosValidos,
	rangoCuotasValido,
	resumenConfirmacion,
	tieneFiltroAdemasDelAnio,
	vistaPreviaDesactualizada,
} from './carga-inicial.logic';

describe('carga-inicial.logic · fechas', () => {
	it('isoLocal usa los campos locales, sin pasar por UTC', () => {
		expect(isoLocal(new Date(2026, 2, 1))).toBe('2026-03-01');
		expect(isoLocal(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
	});

	it('fechaDesdeIso acepta fecha o ISO con hora y rechaza lo vacío', () => {
		expect(fechaDesdeIso('2026-03-01T00:00:00')).toEqual(new Date(2026, 2, 1));
		expect(fechaDesdeIso('2026-03-01')).toEqual(new Date(2026, 2, 1));
		expect(fechaDesdeIso(null)).toBeNull();
		expect(fechaDesdeIso('')).toBeNull();
	});

	it('la fecha inicial es opcional pero debe caer en el año (INV-PG14)', () => {
		expect(fechaInicialEnAnio(null, 2026)).toBe(true);
		expect(fechaInicialEnAnio(new Date(2026, 2, 1), 2026)).toBe(true);
		expect(fechaInicialEnAnio(new Date(2027, 0, 1), 2026)).toBe(false);
	});

	it('las opciones de año son anterior, actual y siguiente', () => {
		expect(opcionesAnio(new Date(2026, 10, 10))).toEqual([2025, 2026, 2027]);
	});
});

describe('carga-inicial.logic · parámetros del año', () => {
	const base = { anio: 2026, pagoMinimoPartes: 20, montoRecargo: 5, fechaInicial: null };

	it('acepta valores no negativos con hasta 2 decimales', () => {
		expect(parametrosValidos(base)).toBe(true);
		expect(parametrosValidos({ ...base, montoRecargo: 0 })).toBe(true);
		expect(parametrosValidos({ ...base, montoRecargo: 5.25 })).toBe(true);
	});

	it('rechaza vacíos, negativos, más de 2 decimales o fecha fuera del año (INV-PG07)', () => {
		expect(parametrosValidos({ ...base, pagoMinimoPartes: null })).toBe(false);
		expect(parametrosValidos({ ...base, montoRecargo: null })).toBe(false);
		expect(parametrosValidos({ ...base, montoRecargo: -1 })).toBe(false);
		expect(parametrosValidos({ ...base, pagoMinimoPartes: 20.123 })).toBe(false);
		expect(parametrosValidos({ ...base, fechaInicial: new Date(2027, 0, 5) })).toBe(false);
	});

	it('rowVersion va nulo al crear y es el último leído al editar (INV-S05)', () => {
		const datos = { ...base, fechaInicial: new Date(2026, 2, 2) };
		expect(armarPayloadParametros(datos, null)).toEqual({
			anio: 2026,
			pagoMinimoPartes: 20,
			montoRecargo: 5,
			fechaInicial: '2026-03-02',
			rowVersion: null,
		});
		const existente = { anio: 2026, pagoMinimoPartes: 20, montoRecargo: 5, fechaInicial: null, rowVersion: 'AAAB' };
		expect(armarPayloadParametros(base, existente).rowVersion).toBe('AAAB');
		expect(armarPayloadParametros(base, existente).fechaInicial).toBeNull();
	});
});

describe('carga-inicial.logic · generar cargos', () => {
	it('la lista de inscripción solo viaja si se eligió el concepto y hay alumnos (D5)', () => {
		expect(armarPayloadGeneracion(2026, ['MATRICULA', 'INSCRIPCION'], [7, 9]).inscripcionEstudianteIds).toEqual([7, 9]);
		expect(armarPayloadGeneracion(2026, ['MATRICULA', 'INSCRIPCION'], []).inscripcionEstudianteIds).toBeNull();
		expect(armarPayloadGeneracion(2026, ['MATRICULA', 'PENSION'], [7, 9]).inscripcionEstudianteIds).toBeNull();
	});

	it('envía los conceptos elegidos, sin salón (se genera para todo el año)', () => {
		expect(armarPayloadGeneracion(2026, ['PENSION'], [])).toEqual({
			anio: 2026,
			conceptos: ['PENSION'],
			salonId: null,
			inscripcionEstudianteIds: null,
		});
	});

	it('describe cada omisión con su motivo, concepto y cantidad', () => {
		expect(describirOmision({ motivo: 'SIN_CRONOGRAMA', concepto: 'PENSION', cantidad: 120 })).toBe(
			'Pensión: Sin cronograma del año: no hay cuotas de pensión que generar. (120)',
		);
		expect(describirOmision({ motivo: 'SIN_MONTO', concepto: null, cantidad: 3 })).toBe('Sin monto definido para el año y nivel. (3)');
	});
});

describe('carga-inicial.logic · confirmar sin dato', () => {
	const datos = { anio: 2026, salonId: null, concepto: null, cuotaDesde: null, cuotaHasta: null };

	it('exige al menos un filtro además del año (CARGO_CONFIRMACION_SIN_FILTRO)', () => {
		expect(tieneFiltroAdemasDelAnio(datos)).toBe(false);
		expect(tieneFiltroAdemasDelAnio({ ...datos, salonId: 4 })).toBe(true);
		expect(tieneFiltroAdemasDelAnio({ ...datos, concepto: 'MATRICULA' })).toBe(true);
		expect(tieneFiltroAdemasDelAnio({ ...datos, cuotaHasta: 3 })).toBe(true);
	});

	it('valida el rango de cuotas', () => {
		expect(rangoCuotasValido(null, null)).toBe(true);
		expect(rangoCuotasValido(1, 3)).toBe(true);
		expect(rangoCuotasValido(3, 3)).toBe(true);
		expect(rangoCuotasValido(4, 3)).toBe(false);
		expect(rangoCuotasValido(0, 3)).toBe(false);
	});

	it('arma el filtro y el payload con el conteo de la vista previa', () => {
		const filtro = armarFiltroSinDato({ ...datos, salonId: 4, concepto: 'PENSION', cuotaDesde: 1, cuotaHasta: 2 });
		expect(filtro).toEqual({ anio: 2026, salonId: 4, estudianteId: null, concepto: 'PENSION', cuotaDesde: 1, cuotaHasta: 2, cargoIds: null });
		expect(armarPayloadConfirmacion(filtro, 'SALDADO', '  caja 2025 ', 40)).toEqual({
			filtro,
			desenlace: 'SALDADO',
			motivo: 'caja 2025',
			cargosEsperados: 40,
		});
		expect(armarPayloadConfirmacion(filtro, 'DEBE', '   ', 40).motivo).toBeNull();
	});

	it('«1 cargo» en singular y «N cargos» en plural', () => {
		expect(cantidadCargos(1)).toBe('1 cargo');
		expect(cantidadCargos(0)).toBe('0 cargos');
		expect(cantidadCargos(2574)).toBe('2574 cargos');
	});

	it('resume en singular y plural', () => {
		expect(resumenConfirmacion(1, 1)).toBe('1 cargo de 1 alumno');
		expect(resumenConfirmacion(24, 3)).toBe('24 cargos de 3 alumnos');
	});
});

describe('carga-inicial.logic · errores', () => {
	it('traduce el errorCode y nunca muestra el texto crudo', () => {
		expect(mensajeDeError({ status: 400, error: { errorCode: 'PAGO_PARAMETRO_FECHA_INICIAL_FUERA_DE_ANIO' } }, 'guardar-parametros')).toBe(
			'La fecha inicial debe caer dentro del año elegido.',
		);
		expect(mensajeDeError({ status: 400, error: { errorCode: 'CARGO_CONFIRMACION_SIN_FILTRO' } }, 'vista-previa')).toContain('al menos un filtro');
	});

	it('sin respuesta del servidor explica cómo comprobar el efecto antes de repetir', () => {
		expect(mensajeDeError({ status: 0 }, 'generar')).toContain('ya existen');
		expect(mensajeDeError({ status: 0 }, 'confirmar')).toContain('el conteo bajará');
	});

	it('un 409 sin código conocido se trata como competencia; el resto, genérico', () => {
		expect(mensajeDeError({ status: 409, error: { errorCode: 'CONCURRENCY_CONFLICT' } }, 'guardar-parametros')).toContain('al mismo tiempo');
		expect(mensajeDeError({ status: 500 }, 'generar')).toBe('No se pudieron generar los cargos. Intenta de nuevo.');
		expect(mensajeDeError(null, 'confirmar')).toBe('No se pudieron confirmar los cargos. Intenta de nuevo.');
	});

	it('detecta la vista previa desactualizada (solo 409 con ese sufijo)', () => {
		expect(vistaPreviaDesactualizada({ status: 409, error: { errorCode: 'CARGO_GENERACION_VISTA_PREVIA_DESACTUALIZADA' } })).toBe(true);
		expect(vistaPreviaDesactualizada({ status: 409, error: { errorCode: 'CARGO_CONFIRMACION_VISTA_PREVIA_DESACTUALIZADA' } })).toBe(true);
		expect(vistaPreviaDesactualizada({ status: 409, error: { errorCode: 'PAGO_PARAMETRO_CONFLICTO' } })).toBe(false);
		expect(vistaPreviaDesactualizada({ status: 400, error: { errorCode: 'CARGO_GENERACION_VISTA_PREVIA_DESACTUALIZADA' } })).toBe(false);
	});

	it('un año sin parámetros (404) no es un error al leer', () => {
		expect(anioSinParametros({ status: 404, error: { errorCode: 'PAGO_PARAMETRO_ANIO_INEXISTENTE' } })).toBe(true);
		expect(anioSinParametros({ status: 404, error: { errorCode: 'OTRO' } })).toBe(false);
		expect(anioSinParametros({ status: 500 })).toBe(false);
	});
});
