import type { MiCargo, MiCargoEstado, MiPago, MisPagos } from '@data/models';
import type { EduTagSeverity } from '@edu-ui';

/**
 * Lógica pura de «Mis pagos»: etiquetas, formatos y mensajes de error. Sin Angular para probarla sola.
 * Vocabulario del colegio: nada de «cargo», «INV», «sin dato» ni «corte» en lo que ve la familia.
 */

// #region Formatos
const SOLES = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const FECHA = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

/** `S/ 1,234.50`. El servidor ya entrega los montos calculados; aquí no se hace aritmética. */
export const formatSoles = (monto: number): string => SOLES.format(monto);

/** Fecha civil `dd/mm/aaaa`. Entra `YYYY-MM-DD` o ISO; se lee sin zona horaria para no correrla un día. */
export function formatFecha(iso: string): string {
	const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
	return FECHA.format(new Date(Date.UTC(y, m - 1, d)));
}

/** `HH:mm:ss` → `HH:mm`; `null` si no hay hora. */
export const formatHora = (hora: string | null): string | null => (hora ? hora.slice(0, 5) : null);
// #endregion

// #region Etiquetas
export interface EtiquetaView {
	label: string;
	severity: EduTagSeverity;
}

const ESTADOS: Record<MiCargoEstado, EtiquetaView> = {
	Pagado: { label: 'Pagado', severity: 'success' },
	Vencida: { label: 'Vencida', severity: 'danger' },
	EnPlazo: { label: 'En plazo', severity: 'secondary' },
	Pendiente: { label: 'Pendiente', severity: 'warn' },
	EnRevision: { label: 'En revisión', severity: 'info' },
};

export const etiquetaEstado = (cargo: Pick<MiCargo, 'estado'>): EtiquetaView => ESTADOS[cargo.estado];

export const TEXTO_EN_REVISION = 'En revisión por el colegio';

/** Una cuota en revisión nunca muestra importes: el texto del servidor manda, con un respaldo fijo. */
export const textoEnRevision = (cargo: Pick<MiCargo, 'mensaje'>): string => cargo.mensaje?.trim() || TEXTO_EN_REVISION;

/** Sin `detalle` no hay importes que mostrar, aunque el estado no diga «en revisión» (defensa en profundidad, INV-PG17). */
export const esEnRevision = (cargo: Pick<MiCargo, 'estado' | 'detalle'>): boolean =>
	cargo.estado === 'EnRevision' || cargo.detalle === null;

const MEDIOS: Record<string, string> = {
	EFECTIVO: 'Efectivo',
	TRANSFERENCIA: 'Transferencia',
	DEPOSITO: 'Depósito',
	YAPE: 'Yape',
	PLIN: 'Plin',
	OTRO: 'Otro',
};

export const medioDe = (medio: string): string => MEDIOS[medio] ?? medio;

export const etiquetaVigencia = (pago: Pick<MiPago, 'vigente'>): EtiquetaView =>
	pago.vigente ? { label: 'Registrado', severity: 'success' } : { label: 'Anulado', severity: 'secondary' };

/** «Pensión · Marzo 2026», o «Matrícula 2027» cuando no hay cuota. */
export const tituloCargo = (c: { concepto: string; cuota: string | null; anio: number }): string =>
	c.cuota ? `${c.concepto} · ${c.cuota} ${c.anio}` : `${c.concepto} ${c.anio}`;
// #endregion

// #region Estado de la vista
/** Sin cuotas ni pagos: el colegio todavía no cargó información de este estudiante. */
export const estaVacio = (cuenta: MisPagos): boolean => cuenta.cargos.length === 0 && cuenta.pagos.length === 0;
// #endregion

// #region Errores
export interface ErrorVista {
	titulo: string;
	detalle: string;
	icono: string;
	/** Reintentar solo sirve cuando el problema puede pasar solo (red, servidor). */
	reintentable: boolean;
}

export interface ErrorHttp {
	status?: number;
	error?: { errorCode?: string } | null;
}

/** Mensaje en español por `errorCode` y status. Nunca se muestra el texto crudo del servidor. */
export function errorVista(err: ErrorHttp | null | undefined): ErrorVista {
	const codigo = err?.error?.errorCode;
	if (codigo === 'PAGO_MIS_PAGOS_SIN_VER_COMO') {
		return {
			titulo: 'No disponible en «Ver como»',
			detalle: 'Los pagos solo se ven entrando con la cuenta del propio estudiante.',
			icono: 'pi pi-eye-slash',
			reintentable: false,
		};
	}
	if (codigo === 'PAGO_MIS_PAGOS_SOLO_ESTUDIANTE' || err?.status === 403) {
		return {
			titulo: 'Esta pantalla es solo para estudiantes',
			detalle: 'Entra con la cuenta del estudiante para ver sus pagos.',
			icono: 'pi pi-lock',
			reintentable: false,
		};
	}
	if (err?.status === 401) {
		return {
			titulo: 'Tu sesión venció',
			detalle: 'Vuelve a ingresar para ver tus pagos.',
			icono: 'pi pi-sign-in',
			reintentable: false,
		};
	}
	if (err?.status === 0) {
		return {
			titulo: 'Sin conexión',
			detalle: 'Necesitas internet para ver tus pagos. Revisa tu conexión e inténtalo de nuevo.',
			icono: 'pi pi-wifi',
			reintentable: true,
		};
	}
	return {
		titulo: 'No pudimos cargar tus pagos',
		detalle: 'Inténtalo de nuevo en unos minutos.',
		icono: 'pi pi-exclamation-triangle',
		reintentable: true,
	};
}
// #endregion
