// #region Imports
import { nombreMes } from '../panel-cobranza/panel-cobranza.logic';
// #endregion

/**
 * Fechas del cronograma de pensiones (P123 F3, INV-PG05). Todas viajan como texto `YYYY-MM-DD` y la aritmética va en
 * UTC (`Date.UTC`): así la zona horaria del navegador nunca corre el día. Sin Angular para poder probarla sola.
 */

// #region Constantes
export const CUOTAS_POR_ANIO = 10;
export const MAX_ETIQUETA = 30;

/** Meses en que la cuota vence el 15 y no a fin de mes: julio, agosto y diciembre. */
const MESES_QUINCENA: readonly number[] = [7, 8, 12];
const DIA_LARGO = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone: 'UTC' });
const MS_POR_DIA = 86_400_000;
const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/;
// #endregion

// #region Conversión
function utc(iso: string): Date {
	const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

/** Nunca `toISOString()`: el texto se arma con los campos UTC, que son la fecha civil. */
function isoUtc(fecha: Date): string {
	const y = String(fecha.getUTCFullYear()).padStart(4, '0');
	const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
	const d = String(fecha.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
// #endregion

// #region Lectura
/** `YYYY-MM-DD` de un día que existe: descarta `2027-02-30`, `31/03/2027` y el vacío. */
export function esFechaIso(iso: string): boolean {
	return FORMATO_ISO.test(iso) && isoUtc(utc(iso)) === iso;
}

/** De 0 (domingo) a 6 (sábado). */
export function numeroDiaSemana(iso: string): number {
	return utc(iso).getUTCDay();
}

/** «miércoles». Va el día largo porque «mar» (martes) se confunde con la etiqueta «Marzo». */
export function diaDeLaSemana(iso: string): string {
	return DIA_LARGO.format(utc(iso));
}

/** «miércoles 31/03/2027». Acepta también `YYYY-MM-DDT00:00:00`. */
export function fechaConDiaLargo(iso: string): string {
	const [y, m, d] = iso.slice(0, 10).split('-');
	return `${diaDeLaSemana(iso)} ${d}/${m}/${y}`;
}

/** Días de `desde` a `hasta`: negativo si `hasta` es anterior. */
export function diasEntre(desde: string, hasta: string): number {
	return Math.round((utc(hasta).getTime() - utc(desde).getTime()) / MS_POR_DIA);
}
// #endregion

// #region Sugerencias
/** La cuota 1 vence en marzo y la 10 en diciembre, como el cronograma de TEST 2026. */
export function mesDeCuota(numero: number): number {
	return numero + 2;
}

/** «Marzo» … «Diciembre», con «Setiembre» como el resto de pagos. */
export function etiquetaSugerida(numero: number): string {
	return nombreMes(mesDeCuota(numero));
}

/**
 * Vencimiento habitual de la cuota: fin de mes, o el 15 en julio, agosto y diciembre; si cae sábado o domingo, el
 * viernes anterior. Es solo una sugerencia: el sistema guarda fechas, no la regla, y la persona las revisa antes de guardar.
 */
export function fechaSugerida(anio: number, numero: number): string {
	const mes = mesDeCuota(numero);
	const dia = MESES_QUINCENA.includes(mes) ? 15 : new Date(Date.UTC(anio, mes, 0)).getUTCDate();
	const fecha = new Date(Date.UTC(anio, mes - 1, dia));
	fecha.setUTCDate(dia - diasHastaElViernes(fecha.getUTCDay()));
	return isoUtc(fecha);
}

function diasHastaElViernes(diaSemana: number): number {
	if (diaSemana === 6) return 1;
	if (diaSemana === 0) return 2;
	return 0;
}
// #endregion
