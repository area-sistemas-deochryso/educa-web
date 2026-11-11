// #region Imports
import type { CandidatoImportacion, EstadoFilaImportacion, FilaEvaluada, FilaImportacion } from '@data/models';
import { COLUMNAS_PLANTILLA } from './importacion-plantilla';
// #endregion

/**
 * Lógica pura de la importación de saldos iniciales (P119 F6c): plantilla, lectura de las filas de la hoja y
 * armado del payload. Sin Angular para poder probarla sola. El BE decide siempre; acá solo se evita mandar lo que
 * no se puede convertir (fecha, monto, cuota) y se muestran los estados que el BE devuelve.
 */

export const LIMITE_FILAS = 3000;
export const HOJA_DATOS = 'Datos';

// #region Lectura de la hoja
/** Una fila de `ExcelService.parseXlsx`: cabecera → celda. SheetJS agrega `__rowNum__` (0-based, no enumerable). */
export type FilaHoja = Record<string, unknown>;

export interface FilaLeida {
	/** Número de la fila en la hoja (la primera de datos es la 2). */
	numero: number;
	/** `null` cuando una celda no se pudo convertir: la fila no viaja y se muestra como inválida. */
	fila: FilaImportacion | null;
	errorLocal: string | null;
	/** Lo que se ve en la tabla aunque la fila no viaje. */
	alumno: string;
	concepto: string;
	cuota: number | null;
	tipo: string;
}

export type ResultadoLectura =
	| { ok: true; filas: FilaLeida[] }
	| { ok: false; motivo: 'sin-columnas' | 'vacio' | 'excede-limite'; mensaje: string };

/** Sin tildes, minúsculas y solo letras/dígitos: `«Salón»`, `salon` y `SALÓN ` son la misma columna. */
export function normalizarClave(texto: string): string {
	return texto
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

const CLAVE_A_CAMPO: ReadonlyMap<string, keyof FilaImportacion> = new Map(
	COLUMNAS_PLANTILLA.map((c) => [normalizarClave(c.header), c.key]),
);

const COLUMNAS_OBLIGATORIAS = ['concepto', 'tipo'] as const;

const celdaVacia = (v: unknown): boolean => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** Texto limpio o `undefined`; los números de Excel (DNI, cuota) se pasan a texto sin decimales sobrantes. */
export function textoDe(v: unknown): string | undefined {
	if (celdaVacia(v)) return undefined;
	return String(v).trim();
}

/** Texto en mayúsculas y sin tildes: `Matrícula` → `MATRICULA`, `pensión` → `PENSION`. */
export function codigoDe(v: unknown): string | undefined {
	const t = textoDe(v);
	return t === undefined ? undefined : t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

/** Un DNI que Excel guardó como número pierde los ceros de la izquierda. */
export function dniDe(v: unknown): string | undefined {
	if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v)).padStart(8, '0');
	const t = textoDe(v);
	return t === undefined ? undefined : t.replace(/\s+/g, '');
}

/** `undefined` = celda vacía; `null` = hay algo pero no es un monto. */
export function montoDe(v: unknown): number | undefined | null {
	if (celdaVacia(v)) return undefined;
	if (typeof v === 'number') return Number.isFinite(v) ? v : null;
	let t = String(v).trim().replace(/^S\/\.?\s*/i, '').replace(/\s+/g, '');
	if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, '');
	else if (t.includes(',')) t = t.replace(',', '.');
	if (!/^\d+(\.\d+)?$/.test(t)) return null;
	return Number(t);
}

/** `undefined` = celda vacía; `null` = hay algo pero no es una cuota entera. */
export function cuotaDe(v: unknown): number | undefined | null {
	if (celdaVacia(v)) return undefined;
	const n = typeof v === 'number' ? v : Number(String(v).trim());
	return Number.isInteger(n) ? n : null;
}

const DIA_MS = 86_400_000;
const pad2 = (n: number): string => String(n).padStart(2, '0');

function isoSiExiste(anio: number, mes: number, dia: number): string | null {
	const d = new Date(Date.UTC(anio, mes - 1, dia));
	if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
	return `${anio}-${pad2(mes)}-${pad2(dia)}`;
}

/**
 * `dd/mm/aaaa` (o `aaaa-mm-dd`) como fecha civil `YYYY-MM-DD`. También acepta el serial de Excel, que es lo que llega
 * cuando la persona tipea la fecha en la celda y Excel la convierte. `undefined` = vacía; `null` = no es una fecha.
 */
export function fechaDe(v: unknown): string | undefined | null {
	if (celdaVacia(v)) return undefined;
	if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
	if (typeof v === 'number') {
		if (!Number.isFinite(v) || v < 1) return null;
		const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * DIA_MS);
		return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
	}
	const t = String(v).trim();
	const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(t);
	if (dmy) return isoSiExiste(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
	const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
	if (ymd) return isoSiExiste(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
	return null;
}

/**
 * `HH:mm`. El serial de Excel para una hora es la fracción del día. Si no se reconoce, se manda el texto tal cual:
 * el BE valida el formato y devuelve `INVALIDA` con la regla.
 */
export function horaDe(v: unknown): string | undefined {
	if (celdaVacia(v)) return undefined;
	if (typeof v === 'number' && v >= 0 && v < 1) {
		const minutos = Math.round(v * 1440) % 1440;
		return `${pad2(Math.floor(minutos / 60))}:${pad2(minutos % 60)}`;
	}
	const t = String(v).trim();
	const hm = /^(\d{1,2}):(\d{2})(:\d{2})?$/.exec(t);
	return hm ? `${pad2(Number(hm[1]))}:${hm[2]}` : t;
}

function numeroDeFila(fila: FilaHoja, indice: number): number {
	const n = (fila as { __rowNum__?: unknown }).__rowNum__;
	// SheetJS: `__rowNum__` es 0-based sobre la hoja; la fila 1 es la cabecera.
	return typeof n === 'number' ? n + 1 : indice + 2;
}

/** Renombra las celdas a los campos de la plantilla ignorando tildes, mayúsculas y columnas desconocidas. */
function porCampo(fila: FilaHoja): Partial<Record<keyof FilaImportacion, unknown>> {
	const salida: Partial<Record<keyof FilaImportacion, unknown>> = {};
	for (const [clave, valor] of Object.entries(fila)) {
		const campo = CLAVE_A_CAMPO.get(normalizarClave(clave));
		if (campo) salida[campo] = valor;
	}
	return salida;
}

/** Faltan las columnas sin las que la fila no tiene sentido (`Concepto`, `Tipo`). */
export function columnasFaltantes(cabeceras: readonly string[]): string[] {
	const presentes = new Set(cabeceras.map(normalizarClave));
	return COLUMNAS_OBLIGATORIAS.filter((c) => !presentes.has(c)).map((c) => (c === 'concepto' ? 'Concepto' : 'Tipo'));
}

function leerFila(hoja: FilaHoja, indice: number): FilaLeida | null {
	const c = porCampo(hoja);
	const valores = Object.values(c);
	if (valores.every(celdaVacia)) return null;

	const numero = numeroDeFila(hoja, indice);
	const cuota = cuotaDe(c.cuota);
	const monto = montoDe(c.monto);
	const fecha = fechaDe(c.fecha);

	const errores: string[] = [];
	if (cuota === null) errores.push('La cuota debe ser un número entero.');
	if (monto === null) errores.push('El monto no es un número.');
	if (fecha === null) errores.push('La fecha no es válida: usa dd/mm/aaaa.');

	const apellidos = textoDe(c.apellidos);
	const nombres = textoDe(c.nombres);
	const dni = dniDe(c.dni);
	const concepto = codigoDe(c.concepto) ?? '';
	const tipo = codigoDe(c.tipo) ?? '';
	const alumno = [apellidos, nombres].filter(Boolean).join(', ') || (dni ? `DNI ${dni}` : '—');

	const resumen = { numero, alumno, concepto, cuota: typeof cuota === 'number' ? cuota : null, tipo };
	if (errores.length > 0) return { ...resumen, fila: null, errorLocal: errores.join(' ') };

	const fila: FilaImportacion = {
		numero,
		dni,
		apellidos,
		nombres,
		grado: textoDe(c.grado),
		salon: textoDe(c.salon),
		concepto,
		cuota: cuota ?? undefined,
		tipo,
		estado: codigoDe(c.estado),
		monto: monto ?? undefined,
		fecha: fecha ?? undefined,
		medio: codigoDe(c.medio),
		comprobante: textoDe(c.comprobante),
		numeroOperacion: textoDe(c.numeroOperacion),
		bancoOrigen: textoDe(c.bancoOrigen),
		hora: horaDe(c.hora),
		motivo: textoDe(c.motivo),
	};
	return { ...resumen, fila, errorLocal: null };
}

/** Una fila de la hoja = una fila del contrato. Las filas totalmente en blanco se ignoran. */
export function leerFilas(hoja: readonly FilaHoja[]): ResultadoLectura {
	if (hoja.length === 0) {
		return { ok: false, motivo: 'vacio', mensaje: 'La hoja no tiene filas. Usa la plantilla y llena al menos una fila.' };
	}
	const faltan = columnasFaltantes(Object.keys(hoja[0]));
	if (faltan.length > 0) {
		return {
			ok: false,
			motivo: 'sin-columnas',
			mensaje: `No encuentro la columna ${faltan.join(' ni ')} en la primera fila de la hoja. Revisa que sea la plantilla.`,
		};
	}
	const filas = hoja.map(leerFila).filter((f): f is FilaLeida => f !== null);
	if (filas.length === 0) {
		return { ok: false, motivo: 'vacio', mensaje: 'La hoja no tiene filas con datos. Usa la plantilla y llena al menos una fila.' };
	}
	if (filas.length > LIMITE_FILAS) {
		return {
			ok: false,
			motivo: 'excede-limite',
			mensaje: `El archivo tiene ${filas.length} filas y el máximo por carga es ${LIMITE_FILAS}. Divídelo en varios archivos.`,
		};
	}
	return { ok: true, filas };
}
// #endregion

// #region Envío al BE
export interface Resolucion {
	/** Fila de la hoja → alumno elegido a mano. */
	resueltas: ReadonlyMap<number, number>;
	/** Filas que la persona descartó: no se mandan. */
	descartadas: ReadonlySet<number>;
}

/** Las filas que viajan: las legibles, sin las descartadas y con el alumno elegido a mano cuando lo hay. */
export function armarFilasEnvio(leidas: readonly FilaLeida[], r: Resolucion): FilaImportacion[] {
	const filas: FilaImportacion[] = [];
	for (const l of leidas) {
		if (!l.fila || r.descartadas.has(l.numero)) continue;
		const estudianteId = r.resueltas.get(l.numero);
		filas.push(estudianteId === undefined ? l.fila : { ...l.fila, estudianteId });
	}
	return filas;
}
// #endregion

// #region Vista previa
/** Estados que muestra la tabla: los del BE más los que solo existen en el cliente. */
export type EstadoVista = EstadoFilaImportacion | 'DESCARTADA';

export interface FilaVista {
	numero: number;
	alumno: string;
	concepto: string;
	cuota: number | null;
	tipo: string;
	estado: EstadoVista;
	mensaje: string | null;
	/** Opciones del selector de la fila `SIN_RESOLVER`: el alumno posible y su salón. */
	candidatos: { value: number; label: string }[];
	/** Alumno elegido a mano (o resuelto por el BE) para mostrar en lugar del texto de la hoja. */
	alumnoResuelto: string | null;
}

export const ESTADOS_VISTA: readonly { value: EstadoVista; label: string }[] = [
	{ value: 'LISTA', label: 'Lista' },
	{ value: 'ALERTA', label: 'Con alerta' },
	{ value: 'YA_EXISTE', label: 'Ya existe' },
	{ value: 'SIN_RESOLVER', label: 'Sin resolver' },
	{ value: 'SIN_CARGO', label: 'Sin cargo' },
	{ value: 'INVALIDA', label: 'Inválida' },
	{ value: 'DESCARTADA', label: 'Descartada' },
];

export const SEVERIDAD_ESTADO: Readonly<Record<EstadoVista, 'success' | 'info' | 'warn' | 'danger' | 'secondary'>> = {
	LISTA: 'success',
	ALERTA: 'warn',
	YA_EXISTE: 'info',
	SIN_RESOLVER: 'warn',
	SIN_CARGO: 'danger',
	INVALIDA: 'danger',
	DESCARTADA: 'secondary',
};

const etiquetaCandidato = (c: CandidatoImportacion): { value: number; label: string } => ({
	value: c.estudianteId,
	label: c.salon ? `${c.nombre} · ${c.salon}` : c.nombre,
});

export const etiquetaEstado = (estado: EstadoVista): string => ESTADOS_VISTA.find((e) => e.value === estado)?.label ?? estado;

/**
 * Une lo leído de la hoja con lo que respondió el BE. Una fila ilegible o descartada no viajó: su estado es local.
 * Si todavía no hay vista previa, las filas legibles aparecen sin estado y no se listan (`null` en el llamador).
 */
export function armarFilasVista(leidas: readonly FilaLeida[], evaluadas: readonly FilaEvaluada[], descartadas: ReadonlySet<number>): FilaVista[] {
	const porNumero = new Map(evaluadas.map((e) => [e.numero, e]));
	const filas: FilaVista[] = [];
	for (const l of leidas) {
		const base = { numero: l.numero, alumno: l.alumno, concepto: l.concepto, cuota: l.cuota, tipo: l.tipo };
		if (descartadas.has(l.numero)) {
			filas.push({ ...base, estado: 'DESCARTADA', mensaje: 'Descartada por ti: no se importa.', candidatos: [], alumnoResuelto: null });
			continue;
		}
		if (!l.fila) {
			filas.push({ ...base, estado: 'INVALIDA', mensaje: l.errorLocal, candidatos: [], alumnoResuelto: null });
			continue;
		}
		const e = porNumero.get(l.numero);
		if (!e) continue;
		filas.push({ ...base, estado: e.estado, mensaje: e.mensaje, candidatos: (e.candidatos ?? []).map(etiquetaCandidato), alumnoResuelto: distintoDelArchivo(e.alumno, l.alumno) });
	}
	return filas;
}

/** El nombre del BE solo se destaca si dice algo distinto de lo escrito: mayúsculas, tildes y comas no cuentan. */
function distintoDelArchivo(resuelto: string | null, escrito: string): string | null {
	return resuelto && normalizarClave(resuelto) !== normalizarClave(escrito) ? resuelto : null;
}

export function conteoPorEstado(filas: readonly FilaVista[]): Map<EstadoVista, number> {
	const conteo = new Map<EstadoVista, number>();
	for (const f of filas) conteo.set(f.estado, (conteo.get(f.estado) ?? 0) + 1);
	return conteo;
}

export function filtrarPorEstado(filas: readonly FilaVista[], estado: EstadoVista | null): FilaVista[] {
	return estado === null ? [...filas] : filas.filter((f) => f.estado === estado);
}

/** Cuántas filas siguen sin alumno elegido: confirmar es posible igual, pero conviene que la persona lo sepa. */
export function pendientesDeResolver(filas: readonly FilaVista[]): number {
	return filas.filter((f) => f.estado === 'SIN_RESOLVER').length;
}

export const cantidadFilas = (n: number): string => (n === 1 ? '1 fila' : `${n} filas`);

export function resumenResultado(r: { saldosConfirmados: number; pagos: number; descuentos: number }): string {
	const partes = [
		`${r.saldosConfirmados} ${r.saldosConfirmados === 1 ? 'saldo' : 'saldos'}`,
		`${r.pagos} ${r.pagos === 1 ? 'pago' : 'pagos'}`,
		`${r.descuentos} ${r.descuentos === 1 ? 'descuento' : 'descuentos'}`,
	];
	return `Se aplicaron ${partes.join(', ')}.`;
}
// #endregion
