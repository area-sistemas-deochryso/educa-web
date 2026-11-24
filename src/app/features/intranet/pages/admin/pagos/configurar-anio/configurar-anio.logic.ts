// #region Imports
import { cantidadCargos } from '../utils/carga-inicial.logic';
import { CUOTAS_POR_ANIO } from './cronograma-fechas.logic';
import type { CoberturaMontos } from './montos-anio.logic';
import { type EstadoCarga, listaLegible } from './seccion.logic';
// #endregion

/**
 * Guía de pasos de «Configurar año» (P123 F3): en qué estado está cada sección, cuál sigue y por qué «Generar cargos»
 * todavía no se puede usar. Sin Angular para poder probarla sola.
 * - Solo se bloquea «Generar»: mientras carga, si los parámetros faltan o no se pudieron leer (el BE no genera cargos
 *   sin ellos) y si hay cambios sin guardar (los cargos copian lo guardado, no lo que se ve en pantalla).
 * - Que falten montos o cronograma solo se avisa: esos cargos se omiten al generar (INV-PG06, INV-PG05).
 */

// #region Tipos
export type SeccionEditable = 'parametros' | 'montos' | 'cronograma';

export type CausaBloqueo = 'cargando' | 'error-parametros' | 'sin-parametros' | 'sin-guardar';

export interface BloqueoGeneracion {
	causa: CausaBloqueo;
	texto: string;
}

export interface DatosBloqueo {
	cargando: boolean;
	/** La lectura de los parámetros falló: no se sabe si existen. */
	errorParametros: boolean;
	hayParametros: boolean;
	sinGuardar: readonly SeccionEditable[];
}

export interface EstadoParametrosGuardados {
	estado: EstadoCarga;
	guardados: boolean;
}

export interface EstadoMontosGuardados {
	estado: EstadoCarga;
	cobertura: CoberturaMontos;
}

export interface EstadoCronogramaGuardado {
	estado: EstadoCarga;
	cuotasGuardadas: number;
}

export type EstadoPaso =
	| 'cargando'
	| 'error'
	| 'pendiente'
	| 'incompleto'
	| 'sin-guardar'
	| 'listo'
	| 'bloqueado'
	| 'disponible'
	| 'hecho';

export type SeveridadPaso = 'success' | 'warn' | 'info' | 'secondary' | 'danger';

export type NumeroPaso = 1 | 2 | 3 | 4;

export interface PasoAnio {
	numero: NumeroPaso;
	titulo: string;
	/** `id` del título de la sección: la guía la trae a la vista y le da el foco. */
	destino: string;
	estado: EstadoPaso;
	etiqueta: string;
	severidad: SeveridadPaso;
	detalle: string;
	/** El paso que sigue: el primero de 1 a 3 que no está listo, o el 4. Siempre hay uno solo. */
	actual: boolean;
}

/** Lo guardado de cada sección más lo que la pantalla sabe de ellas en conjunto. */
export interface EntradaPasos {
	parametros: EstadoParametrosGuardados;
	montos: EstadoMontosGuardados;
	cronograma: EstadoCronogramaGuardado;
	sinGuardar: readonly SeccionEditable[];
	bloqueo: BloqueoGeneracion | null;
	cargosCreados: number | null;
}

interface EstadoConDetalle {
	estado: EstadoPaso;
	detalle: string;
}

interface PasoSinPresentar extends EstadoConDetalle {
	numero: NumeroPaso;
	titulo: string;
	destino: string;
}

interface Presentacion {
	etiqueta: string;
	severidad: SeveridadPaso;
}
// #endregion

// #region Cambios sin guardar
const SECCIONES: readonly SeccionEditable[] = ['parametros', 'montos', 'cronograma'];

const NOMBRE_SECCION: Readonly<Record<SeccionEditable, string>> = {
	parametros: 'los parámetros',
	montos: 'los montos',
	cronograma: 'el cronograma',
};

/** Las secciones con ediciones sin guardar, siempre en el orden de los pasos. */
export function seccionesSinGuardar(
	cambios: Readonly<Record<SeccionEditable, boolean>>,
): SeccionEditable[] {
	return SECCIONES.filter((s) => cambios[s]);
}

/** «los parámetros», «los montos y el cronograma». */
export function nombresSecciones(secciones: readonly SeccionEditable[]): string {
	return listaLegible(secciones.map((s) => NOMBRE_SECCION[s]));
}

/**
 * Parámetros no tiene «Descartar cambios» (la sección se mantuvo mínima): ofrecer descartar solo es cierto si todas las
 * secciones con cambios lo permiten.
 */
const sePuedenDescartar = (secciones: readonly SeccionEditable[]): boolean =>
	!secciones.includes('parametros');

/** El aviso antes de perder ediciones: al cambiar de año, al salir de la pestaña o del módulo. */
export function mensajeCambiosSinGuardar(
	secciones: readonly SeccionEditable[],
	anio: number,
): string {
	return `Tienes cambios sin guardar en ${nombresSecciones(secciones)} de ${anio}. Si continúas, se pierden.`;
}
// #endregion

// #region Generar cargos: bloqueo y avisos
/**
 * Por qué todavía no se puede generar, en orden de precedencia; `null` si se puede. Sin parámetros el BE responde
 * `PAGO_PARAMETRO_ANIO_INEXISTENTE`; con cambios sin guardar, los cargos copiarían valores que no se ven en pantalla.
 * Una lectura fallida de los parámetros tiene su propia causa: decir «Primero guarda los parámetros» sería falso si
 * ya existen.
 */
export function bloqueoGeneracion(d: DatosBloqueo): BloqueoGeneracion | null {
	if (d.cargando) return { causa: 'cargando', texto: 'Cargando la configuración del año…' };
	if (d.errorParametros) {
		return {
			causa: 'error-parametros',
			texto: 'No se pudieron leer los parámetros del año (paso 1). Vuelve a cargarlos: sin ellos no se pueden generar cargos.',
		};
	}
	if (!d.hayParametros) {
		return {
			causa: 'sin-parametros',
			texto: 'Primero guarda los parámetros del año (paso 1): sin ellos no se pueden generar cargos.',
		};
	}
	if (d.sinGuardar.length > 0) {
		const accion = sePuedenDescartar(d.sinGuardar) ? 'Guárdalos o descártalos' : 'Guárdalos';
		return {
			causa: 'sin-guardar',
			texto: `Tienes cambios sin guardar en ${nombresSecciones(d.sinGuardar)}. ${accion} antes de generar: los cargos se crean con lo guardado.`,
		};
	}
	return null;
}

/** Lo que se omitirá al generar, sin impedirlo. Solo con la sección leída: una lectura fallida no es «falta». */
export function avisosGeneracion(
	montos: EstadoMontosGuardados,
	cronograma: EstadoCronogramaGuardado,
): string[] {
	const avisos: string[] = [];
	if (montos.estado === 'lista' && montos.cobertura.faltantes.length > 0) {
		avisos.push(
			`Faltan montos de ${listaLegible(montos.cobertura.faltantes)}: esos cargos se omitirán al generar (paso 2).`,
		);
	}
	if (cronograma.estado !== 'lista') return avisos;
	const cuotas = cronograma.cuotasGuardadas;
	if (cuotas === 0) {
		avisos.push(
			'Sin cronograma no se generan las cuotas de pensión; matrícula e inscripción sí (paso 3).',
		);
	} else if (cuotas < CUOTAS_POR_ANIO) {
		avisos.push(
			`El cronograma tiene ${cuotas} de ${CUOTAS_POR_ANIO} cuotas: complétalo en el paso 3 para generar todas las pensiones.`,
		);
	}
	return avisos;
}
// #endregion

// #region Guía de pasos
const PRESENTACION: Readonly<Record<EstadoPaso, Presentacion>> = {
	cargando: { etiqueta: 'Cargando', severidad: 'secondary' },
	error: { etiqueta: 'Error', severidad: 'danger' },
	pendiente: { etiqueta: 'Pendiente', severidad: 'warn' },
	incompleto: { etiqueta: 'Incompleto', severidad: 'warn' },
	'sin-guardar': { etiqueta: 'Sin guardar', severidad: 'info' },
	listo: { etiqueta: 'Listo', severidad: 'success' },
	bloqueado: { etiqueta: 'Bloqueado', severidad: 'secondary' },
	disponible: { etiqueta: 'Disponible', severidad: 'info' },
	hecho: { etiqueta: 'Hecho', severidad: 'success' },
};

const DETALLE_BLOQUEO: Readonly<Record<CausaBloqueo, string>> = {
	cargando: 'Cargando la configuración…',
	'error-parametros': 'Vuelve a cargar los parámetros (paso 1).',
	'sin-parametros': 'Necesita los parámetros (paso 1).',
	'sin-guardar': 'Guarda o descarta los cambios antes.',
};

const CARGANDO: EstadoConDetalle = { estado: 'cargando', detalle: 'Cargando…' };
const SIN_GUARDAR: EstadoConDetalle = {
	estado: 'sin-guardar',
	detalle: 'Tienes cambios sin guardar.',
};

function pasoParametros(e: EntradaPasos): EstadoConDetalle {
	const { estado, guardados } = e.parametros;
	if (estado === 'cargando') return CARGANDO;
	if (estado === 'error') {
		return { estado: 'error', detalle: 'No se pudieron cargar: usa «Volver a cargar».' };
	}
	if (e.sinGuardar.includes('parametros')) return SIN_GUARDAR;
	if (guardados) return { estado: 'listo', detalle: 'Guardados.' };
	return { estado: 'pendiente', detalle: 'Pago mínimo por partes y recargo por cuota vencida.' };
}

function pasoMontos(e: EntradaPasos): EstadoConDetalle {
	const { estado, cobertura } = e.montos;
	if (estado === 'cargando') return CARGANDO;
	if (estado === 'error') {
		return { estado: 'error', detalle: 'No se pudieron cargar: usa «Volver a cargar».' };
	}
	if (e.sinGuardar.includes('montos')) return SIN_GUARDAR;
	if (cobertura.vacia)
		return { estado: 'pendiente', detalle: 'Ningún concepto tiene monto todavía.' };
	if (!cobertura.completa) {
		return { estado: 'incompleto', detalle: `Falta: ${listaLegible(cobertura.faltantes)}.` };
	}
	return { estado: 'listo', detalle: 'Todos los conceptos tienen monto.' };
}

function pasoCronograma(e: EntradaPasos): EstadoConDetalle {
	const { estado, cuotasGuardadas } = e.cronograma;
	if (estado === 'cargando') return CARGANDO;
	if (estado === 'error') {
		return { estado: 'error', detalle: 'No se pudo cargar: usa «Volver a cargar».' };
	}
	if (e.sinGuardar.includes('cronograma')) return SIN_GUARDAR;
	if (cuotasGuardadas === 0) {
		return {
			estado: 'pendiente',
			detalle: `Faltan las fechas de las ${CUOTAS_POR_ANIO} cuotas.`,
		};
	}
	if (cuotasGuardadas < CUOTAS_POR_ANIO) {
		return {
			estado: 'incompleto',
			detalle: `Tiene ${cuotasGuardadas} de ${CUOTAS_POR_ANIO} cuotas.`,
		};
	}
	return { estado: 'listo', detalle: `${CUOTAS_POR_ANIO} cuotas con fecha.` };
}

function detalleBloqueo(causa: CausaBloqueo, sinGuardar: readonly SeccionEditable[]): string {
	if (causa === 'sin-guardar' && !sePuedenDescartar(sinGuardar)) return 'Guarda los cambios antes.';
	return DETALLE_BLOQUEO[causa];
}

function pasoGenerar(e: EntradaPasos): EstadoConDetalle {
	if (e.bloqueo) {
		return { estado: 'bloqueado', detalle: detalleBloqueo(e.bloqueo.causa, e.sinGuardar) };
	}
	if (e.cargosCreados !== null) {
		const detalle =
			e.cargosCreados === 1
				? 'Se creó 1 cargo en esta visita.'
				: `Se crearon ${cantidadCargos(e.cargosCreados)} en esta visita.`;
		return { estado: 'hecho', detalle };
	}
	return { estado: 'disponible', detalle: 'Calcula la vista previa y genera.' };
}

/** Los 4 pasos con su estado, su etiqueta y cuál sigue. */
export function armarPasos(e: EntradaPasos): PasoAnio[] {
	const pasos: readonly PasoSinPresentar[] = [
		{ numero: 1, titulo: 'Parámetros', destino: 'parametros-title', ...pasoParametros(e) },
		{ numero: 2, titulo: 'Montos', destino: 'montos-title', ...pasoMontos(e) },
		{ numero: 3, titulo: 'Cronograma', destino: 'cronograma-title', ...pasoCronograma(e) },
		{ numero: 4, titulo: 'Generar cargos', destino: 'generar-title', ...pasoGenerar(e) },
	];
	const actual = pasos.find((p) => p.numero < 4 && p.estado !== 'listo')?.numero ?? 4;
	return pasos.map((p) => ({ ...p, ...PRESENTACION[p.estado], actual: p.numero === actual }));
}
// #endregion

// #region Año sin configurar
/**
 * Nada guardado todavía: ni parámetros, ni montos, ni cronograma. Exige las tres lecturas completas: si una falló,
 * no se sabe qué hay guardado y el año no se presenta como vacío.
 */
export function anioSinConfigurar(e: EntradaPasos): boolean {
	return (
		e.parametros.estado === 'lista' &&
		!e.parametros.guardados &&
		e.montos.estado === 'lista' &&
		e.montos.cobertura.vacia &&
		e.cronograma.estado === 'lista' &&
		e.cronograma.cuotasGuardadas === 0
	);
}

export function textoAnioSinConfigurar(anio: number): string {
	return `El año ${anio} todavía no está configurado: sigue los pasos en orden. Generar exige los parámetros; sin montos o sin cronograma, esos cargos se omiten.`;
}
// #endregion
