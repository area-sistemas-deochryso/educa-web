// #region Imports
import { NIVELES } from '@data/models';
import type { ConceptoConMontos, GuardarMontosAnioPayload, NivelEducativo } from '@data/models';

import { CONCEPTOS } from '../utils/carga-inicial.logic';
import { formatSoles } from '../utils/pagos-format.util';
import { listaLegible } from './seccion.logic';
// #endregion

/**
 * Montos por concepto y nivel del año (P123 F3, INV-PG06): lectura del texto escrito, borrador disperso (solo lo
 * tocado), cambios a enviar y cobertura de lo guardado. Sin Angular para poder probarla sola. El resumen previo al
 * guardado y los textos de resultado viven en `montos-resumen.logic.ts`.
 */

// #region Tipos
/** `null` = «Todos los niveles»: rige en los niveles sin monto propio (el del nivel gana, como `BuscarMonto` del BE). */
export type NivelMonto = NivelEducativo | null;

/** `${conceptoId}|${nivel ?? 'todos'}`: identifica una celda de la grilla. */
export type ClaveMonto = string;

/** Lo escrito por la persona, tal cual, solo en las celdas que tocó. */
export type BorradorMontos = Readonly<Record<ClaveMonto, string>>;

export type LecturaMonto =
	| { tipo: 'vacio' }
	| { tipo: 'valido'; centavos: number }
	| { tipo: 'invalido'; error: string };

export interface OpcionNivelMonto {
	nivel: NivelMonto;
	etiqueta: string;
}

export interface MontoGuardado {
	centavos: number;
	rowVersion: string;
}

export interface CeldaMonto {
	clave: ClaveMonto;
	nivel: NivelMonto;
	nivelEtiqueta: string;
	/** «Inicial (S/)», «Todos los niveles (S/)». */
	etiqueta: string;
	inputId: string;
	ayudaId: string;
	texto: string;
	/** Lo guardado como `320.00`, o `''`. */
	textoBase: string;
	guardado: MontoGuardado | null;
	/** Lo que rige la celda: lo escrito si es válido o lo guardado si no se tocó; `null` si está vacía o es inválida. */
	centavos: number | null;
	error: string | null;
	/** El error o, si lo escrito es válido, su eco en soles. */
	mensaje: string | null;
	esError: boolean;
	/** Difiere de lo guardado, incluidas las celdas inválidas o vaciadas: cuenta como cambio sin guardar. */
	cambiada: boolean;
}

export interface FilaConcepto {
	conceptoId: number;
	codigo: string;
	nombre: string;
	ayuda: string | null;
	soloAlumnosNuevos: boolean;
	porCuota: boolean;
	celdas: CeldaMonto[];
	/** Lo que se cobraría en cada nivel con los valores que rigen ahora. */
	seCobra: string;
}

export interface CambioMonto {
	clave: ClaveMonto;
	conceptoId: number;
	codigo: string;
	concepto: string;
	nivel: NivelMonto;
	nivelEtiqueta: string;
	antesCentavos: number | null;
	ahoraCentavos: number;
	rowVersion: string | null;
}

/** Calculada sobre lo guardado: la usan la guía de pasos y los avisos de «Generar». */
export interface CoberturaMontos {
	vacia: boolean;
	completa: boolean;
	faltantes: string[];
}
// #endregion

// #region Constantes y nombres
/** S/ 99,999,999.99: el `decimal(10,2)` del BE. */
export const MONTO_MAXIMO_CENTAVOS = 9_999_999_999;

/** La pensión se cobra en 10 cuotas al año. */
export const CUOTAS_PENSION = 10;

export const NIVELES_MONTO: readonly OpcionNivelMonto[] = [
	{ nivel: null, etiqueta: 'Todos los niveles' },
	...NIVELES.map((nivel) => ({ nivel, etiqueta: nivel })),
];

const AYUDAS: Readonly<Record<string, string>> = {
	MATRICULA: 'Se cobra una vez al año a cada alumno matriculado.',
	INSCRIPCION: 'Solo a los alumnos nuevos que elijas al generar los cargos (paso 4).',
	PENSION: 'Monto de cada una de las 10 cuotas, no el total del año.',
};

/** El nivel ausente en el JSON (el BE omite los nulos) y el `null` dan la misma clave. */
export function claveMonto(conceptoId: number, nivel: NivelMonto | undefined): ClaveMonto {
	return `${conceptoId}|${nivel ?? 'todos'}`;
}

/** El GET trae los nombres sin tildes: se muestran los de `CONCEPTOS` cuando el código es conocido. */
export function nombreConcepto(c: Pick<ConceptoConMontos, 'codigo' | 'nombre'>): string {
	return CONCEPTOS.find((x) => x.value === c.codigo)?.label ?? c.nombre;
}

export function ayudaConcepto(codigo: string): string | null {
	const ayuda: string | undefined = AYUDAS[codigo];
	return ayuda ?? null;
}
// #endregion

// #region Lectura del texto
const ERROR_MINIMO = 'El monto debe ser mayor que S/ 0.00.';
const ERROR_FORMATO =
	'Escribe solo el número, con punto o coma para los céntimos (por ejemplo, 320.50).';
const ERROR_DECIMALES =
	'Usa como máximo dos decimales y no escribas separador de miles (por ejemplo, 1234.50).';
const ERROR_MAXIMO = 'El monto no puede pasar de S/ 99,999,999.99.';
const ERROR_NO_SE_QUITA =
	'Este monto ya está guardado y no se puede quitar: escribe el valor que corresponde.';

/**
 * Lee lo escrito con aritmética de texto y lo pasa a céntimos enteros: el BE lee el número exacto y rechaza el ruido
 * de la coma flotante (`0.30000000000000004`). El punto y la coma valen como separador decimal; con 3 o más cifras
 * después del separador no se puede saber si era de miles, así que se pide escribirlo sin él.
 */
export function leerMonto(texto: string): LecturaMonto {
	const t = texto.trim().replace(/^s\/\s*/i, '');
	if (t === '') return { tipo: 'vacio' };
	if (t.startsWith('-')) return { tipo: 'invalido', error: ERROR_MINIMO };
	const partes = /^(\d+)(?:[.,](\d*))?$/.exec(t);
	if (!partes) return { tipo: 'invalido', error: ERROR_FORMATO };
	const [, entero = '', fraccion = ''] = partes;
	if (fraccion.length > 2) return { tipo: 'invalido', error: ERROR_DECIMALES };
	// Toda parte entera de 9 o más cifras significativas ya pasa del máximo: la comparación numérica basta.
	const centavos = Number(entero) * 100 + Number(fraccion.padEnd(2, '0'));
	if (centavos > MONTO_MAXIMO_CENTAVOS) return { tipo: 'invalido', error: ERROR_MAXIMO };
	if (centavos <= 0) return { tipo: 'invalido', error: ERROR_MINIMO };
	return { tipo: 'valido', centavos };
}
// #endregion

// #region Lo guardado
/** `Math.round` quita el ruido de la coma flotante al pasar el `decimal(10,2)` del BE a céntimos. */
export function montosGuardados(
	conceptos: readonly ConceptoConMontos[],
): ReadonlyMap<ClaveMonto, MontoGuardado> {
	const guardados = new Map<ClaveMonto, MontoGuardado>();
	for (const c of conceptos) {
		for (const m of c.montos) {
			guardados.set(claveMonto(c.conceptoId, m.nivel), {
				centavos: Math.round(m.monto * 100),
				rowVersion: m.rowVersion,
			});
		}
	}
	return guardados;
}

/** `32050` → `'320.50'`: el texto con el que el input muestra lo guardado. */
export function textoDeCentavos(c: number): string {
	return (c / 100).toFixed(2);
}

const soles = (centavos: number): string => formatSoles(centavos / 100);
// #endregion

// #region Grilla
/** Lo que dice una celda según lo escrito: el eco en soles si es válido y el error si no. */
function leerCelda(
	escrito: string | undefined,
	guardado: MontoGuardado | null,
	porCuota: boolean,
): Pick<CeldaMonto, 'centavos' | 'error' | 'mensaje' | 'cambiada'> {
	if (escrito === undefined) {
		const centavos = guardado?.centavos ?? null;
		return { centavos, error: null, mensaje: null, cambiada: false };
	}
	const lectura = leerMonto(escrito);
	if (lectura.tipo === 'valido') {
		const eco = `= ${soles(lectura.centavos)}${porCuota ? ' por cuota' : ''}`;
		const cambiada = guardado?.centavos !== lectura.centavos;
		return { centavos: lectura.centavos, error: null, mensaje: eco, cambiada };
	}
	// La API no borra montos: vaciar uno guardado no tiene cómo enviarse. Vaciar uno nuevo es no escribirlo.
	const error = lectura.tipo === 'invalido' ? lectura.error : guardado ? ERROR_NO_SE_QUITA : null;
	return { centavos: null, error, mensaje: error, cambiada: error !== null };
}

function celdaMonto(
	concepto: ConceptoConMontos,
	opcion: OpcionNivelMonto,
	guardados: ReadonlyMap<ClaveMonto, MontoGuardado>,
	borrador: BorradorMontos,
): CeldaMonto {
	const clave = claveMonto(concepto.conceptoId, opcion.nivel);
	const inputId = `monto-${concepto.conceptoId}-${opcion.nivel ?? 'todos'}`;
	const guardado = guardados.get(clave) ?? null;
	const textoBase = guardado ? textoDeCentavos(guardado.centavos) : '';
	const escrito: string | undefined = borrador[clave];
	const lectura = leerCelda(escrito, guardado, concepto.codigo === 'PENSION');
	return {
		clave,
		nivel: opcion.nivel,
		nivelEtiqueta: opcion.etiqueta,
		etiqueta: `${opcion.etiqueta} (S/)`,
		inputId,
		ayudaId: `${inputId}-ayuda`,
		texto: escrito ?? textoBase,
		textoBase,
		guardado,
		...lectura,
		esError: lectura.error !== null,
	};
}

/** En cada nivel rige su monto propio o, si no tiene, el de «Todos los niveles» (la regla de `BuscarMonto` del BE). */
function cobroDeFila(celdas: readonly CeldaMonto[], porCuota: boolean): string {
	const centavosDe = (nivel: NivelMonto): number | null =>
		celdas.find((c) => c.nivel === nivel)?.centavos ?? null;
	const general = centavosDe(null);
	const propios = NIVELES.map((nivel) => ({ nivel, propio: centavosDe(nivel) }));
	if (propios.every((p) => (p.propio ?? general) === null)) {
		return 'Sin monto: este cargo no se generará.';
	}
	const sufijo = porCuota ? ' por cuota' : '';
	if (general !== null && propios.every((p) => p.propio === null)) {
		return `Se cobra ${soles(general)}${sufijo} en todos los niveles.`;
	}
	const detalle = propios.map(({ nivel, propio }) => {
		const efectivo = propio ?? general;
		return `${nivel} ${efectivo === null ? 'sin monto' : soles(efectivo)}`;
	});
	return `Se cobra${sufijo}: ${detalle.join(' · ')}`;
}

/** Una fila por concepto, en el orden del servidor, con sus 4 celdas en el orden de `NIVELES_MONTO`. */
export function filasMontos(
	conceptos: readonly ConceptoConMontos[],
	borrador: BorradorMontos,
): FilaConcepto[] {
	const guardados = montosGuardados(conceptos);
	return conceptos.map((c) => {
		const porCuota = c.codigo === 'PENSION';
		const celdas = NIVELES_MONTO.map((opcion) => celdaMonto(c, opcion, guardados, borrador));
		return {
			conceptoId: c.conceptoId,
			codigo: c.codigo,
			nombre: nombreConcepto(c),
			ayuda: ayudaConcepto(c.codigo),
			soloAlumnosNuevos: c.soloAlumnosNuevos,
			porCuota,
			celdas,
			seCobra: cobroDeFila(celdas, porCuota),
		};
	});
}
// #endregion

// #region Borrador y cambios
/**
 * Volver exactamente al texto base quita la celda del borrador; cualquier otro texto, incluso vacío, se conserva tal
 * cual. Se compara sin recortar: si no, NgModel reescribiría el input y se comería el espacio que se está tipeando.
 */
export function conTexto(
	borrador: BorradorMontos,
	celda: Pick<CeldaMonto, 'clave' | 'textoBase'>,
	texto: string,
): BorradorMontos {
	if (texto === celda.textoBase) {
		const { [celda.clave]: _quitado, ...resto } = borrador;
		return resto;
	}
	return { ...borrador, [celda.clave]: texto };
}

/** Solo lo nuevo o cambiado, válido y con valor: el BE valida la versión de cada fila enviada aunque no cambie. */
export function cambiosMontos(filas: readonly FilaConcepto[]): CambioMonto[] {
	return filas.flatMap((f) =>
		f.celdas.flatMap((c): CambioMonto[] =>
			c.cambiada && c.error === null && c.centavos !== null
				? [
						{
							clave: c.clave,
							conceptoId: f.conceptoId,
							codigo: f.codigo,
							concepto: f.nombre,
							nivel: c.nivel,
							nivelEtiqueta: c.nivelEtiqueta,
							antesCentavos: c.guardado?.centavos ?? null,
							ahoraCentavos: c.centavos,
							rowVersion: c.guardado?.rowVersion ?? null,
						},
					]
				: [],
		),
	);
}

export function cantidadErroresMontos(filas: readonly FilaConcepto[]): number {
	return filas.reduce((n, f) => n + f.celdas.filter((c) => c.error !== null).length, 0);
}

export function hayCambiosMontos(filas: readonly FilaConcepto[]): boolean {
	return filas.some((f) => f.celdas.some((c) => c.cambiada));
}

/**
 * «Todos los niveles» viaja como `nivel: null`, y `rowVersion` va `null` solo en las filas nuevas, nunca `''`
 * (INV-S05). `centavos / 100` da el número exacto de 2 decimales que lee el BE.
 */
export function armarPayloadMontos(
	anio: number,
	cambios: readonly CambioMonto[],
): GuardarMontosAnioPayload {
	return {
		anio,
		montos: cambios.map((c) => ({
			conceptoId: c.conceptoId,
			nivel: c.nivel,
			monto: c.ahoraCentavos / 100,
			rowVersion: c.rowVersion,
		})),
	};
}

export function motivoNoRevisarMontos(errores: number, baseIncierta: boolean): string | null {
	if (baseIncierta) {
		return 'Vuelve a leer los montos antes de guardar: no se pudo confirmar qué quedó guardado.';
	}
	if (errores === 1) return 'Corrige el monto marcado para revisar los cambios.';
	if (errores > 1) return `Corrige los ${errores} montos marcados para revisar los cambios.`;
	return null;
}
// #endregion

// #region Cobertura de lo guardado
/** Por concepto sin monto general, los niveles sin monto propio: «Pensión (Primaria y Secundaria)». */
export function coberturaMontos(conceptos: readonly ConceptoConMontos[]): CoberturaMontos {
	const faltantes = conceptos.flatMap((c) => {
		if (c.montos.some((m) => m.nivel == null)) return [];
		const niveles = NIVELES.filter((n) => !c.montos.some((m) => m.nivel === n));
		if (niveles.length === 0) return [];
		const nombre = nombreConcepto(c);
		return [
			niveles.length === NIVELES.length ? nombre : `${nombre} (${listaLegible(niveles)})`,
		];
	});
	return {
		vacia: conceptos.every((c) => c.montos.length === 0),
		completa: conceptos.length > 0 && faltantes.length === 0,
		faltantes,
	};
}
// #endregion
