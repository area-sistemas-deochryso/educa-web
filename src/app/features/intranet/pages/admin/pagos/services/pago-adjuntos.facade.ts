// #region Imports
import { Injectable, computed, inject, signal } from '@angular/core';

import { downloadBlob, logger } from '@core/helpers';
import { ConnectivityService } from '@core/services/connectivity';
import type { PagoAdjunto } from '@data/models';
import { PagoAdjuntoArchivo, PagoAdjuntosApiService } from './pago-adjuntos-api.service';
// #endregion

// #region Reglas del voucher (INV-PG16) — el servidor las vuelve a validar sobre el contenido real
export const ADJUNTO_MAX_BYTES = 10 * 1024 * 1024;
export const ADJUNTO_MAX_ACTIVOS = 3;
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];
const EXTENSIONES_PERMITIDAS = /\.(pdf|jpe?g|png)$/i;
/** Cuánto vive la URL temporal del archivo abierto en otra pestaña. */
const VIDA_URL_MS = 60_000;

const TEXTO_SIN_CONEXION = 'Sin conexión: el voucher se adjunta cuando vuelva el internet. El pago ya registrado no se afecta.';
// #endregion

// #region Mensajes
const MENSAJES_POR_CODIGO: Record<string, string> = {
	PAGO_ADJUNTO_TIPO_NO_PERMITIDO: 'Solo se admiten archivos PDF, JPG o PNG.',
	PAGO_ADJUNTO_TAMANO_EXCEDIDO: 'El archivo pesa más de 10 MB. Elige uno más liviano o toma la foto de nuevo.',
	PAGO_ADJUNTO_VACIO: 'El archivo está vacío. Elige otro.',
	PAGO_ADJUNTO_LIMITE_EXCEDIDO: 'Este pago ya tiene 3 vouchers. Da de baja uno para adjuntar otro.',
	PAGO_ADJUNTO_YA_DADO_DE_BAJA: 'Ese voucher ya fue dado de baja. Recarga la lista.',
	PAGO_ADJUNTO_MOTIVO_BAJA_REQUERIDO: 'Escribe el motivo de la baja.',
	PAGO_ADJUNTO_NO_ENCONTRADO: 'No se encontró el voucher. Recarga la lista e inténtalo de nuevo.',
	PAGO_NO_ENCONTRADO: 'No se encontró el pago. Recarga la pantalla e inténtalo de nuevo.',
};

/** Texto en español por `errorCode` y, si no hay, por status. Nunca el texto crudo del servidor (cita la `INV-PG..`). */
export function mensajeAdjuntoError(err: unknown, accion: string): string {
	const e = err as { status?: number; error?: { errorCode?: string } | null } | null;
	const porCodigo = e?.error?.errorCode ? MENSAJES_POR_CODIGO[e.error.errorCode] : undefined;
	if (porCodigo) return porCodigo;
	if (e?.status === 0) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
	if (e?.status === 403) return 'No tienes permiso para gestionar vouchers de pago.';
	if (e?.status === 413) return MENSAJES_POR_CODIGO['PAGO_ADJUNTO_TAMANO_EXCEDIDO'];
	if (e?.status === 429) return 'Hay muchas operaciones seguidas. Espera un momento e inténtalo de nuevo.';
	return `No se pudo ${accion}. Inténtalo de nuevo.`;
}

/** Validación previa en el navegador, para no subir 10 MB que el servidor va a rechazar. `null` = válido. */
export function validarArchivoAdjunto(archivo: File, activos: number): string | null {
	if (activos >= ADJUNTO_MAX_ACTIVOS) return MENSAJES_POR_CODIGO['PAGO_ADJUNTO_LIMITE_EXCEDIDO'];
	const tipoOk = TIPOS_PERMITIDOS.includes(archivo.type) || (!archivo.type && EXTENSIONES_PERMITIDAS.test(archivo.name));
	if (!tipoOk) return MENSAJES_POR_CODIGO['PAGO_ADJUNTO_TIPO_NO_PERMITIDO'];
	if (archivo.size === 0) return MENSAJES_POR_CODIGO['PAGO_ADJUNTO_VACIO'];
	if (archivo.size > ADJUNTO_MAX_BYTES) return MENSAJES_POR_CODIGO['PAGO_ADJUNTO_TAMANO_EXCEDIDO'];
	return null;
}
// #endregion

/**
 * Voucher de un pago (`INV-PG16`). Se provee a nivel de componente: cada panel tiene su propio estado.
 * - Todo requiere conexión: no se encola ni toca el WAL del registro del pago.
 * - Una operación a la vez (`ocupado`); sin reintentos automáticos (4xx/429 nunca se reintentan).
 * - Dar de baja es una baja con rastro (usuario, fecha, motivo), no un borrado.
 */
@Injectable()
export class PagoAdjuntosFacade {
	private readonly api = inject(PagoAdjuntosApiService);
	private readonly conectividad = inject(ConnectivityService);

	private pagoId: number | null = null;

	readonly adjuntos = signal<PagoAdjunto[]>([]);
	readonly cargando = signal(false);
	readonly subiendo = signal(false);
	/** Id del adjunto que se está viendo, descargando o dando de baja. */
	readonly procesandoId = signal<number | null>(null);
	readonly error = signal<string | null>(null);

	readonly sinConexion = computed(() => !this.conectividad.isOnline());
	readonly textoSinConexion = TEXTO_SIN_CONEXION;
	readonly activos = computed(() => this.adjuntos().filter((a) => a.activo));
	readonly dadosDeBaja = computed(() => this.adjuntos().filter((a) => !a.activo));
	readonly llegoAlLimite = computed(() => this.activos().length >= ADJUNTO_MAX_ACTIVOS);
	readonly ocupado = computed(() => this.cargando() || this.subiendo() || this.procesandoId() !== null);

	cargar(pagoId: number): void {
		this.pagoId = pagoId;
		this.adjuntos.set([]);
		this.error.set(null);
		this.cargando.set(true);
		this.api.listar(pagoId).subscribe({
			next: (lista) => {
				if (this.pagoId !== pagoId) return;
				this.adjuntos.set(lista);
				this.cargando.set(false);
			},
			error: (err: unknown) => {
				logger.error('[PagoAdjuntosFacade] Error al leer los vouchers', err);
				if (this.pagoId !== pagoId) return;
				this.error.set(mensajeAdjuntoError(err, 'leer los vouchers'));
				this.cargando.set(false);
			},
		});
	}

	subir(archivo: File, alSubir?: () => void): void {
		const pagoId = this.pagoId;
		if (pagoId === null || this.ocupado()) return;
		if (this.sinConexion()) return void this.error.set(TEXTO_SIN_CONEXION);
		const invalido = validarArchivoAdjunto(archivo, this.activos().length);
		if (invalido) return void this.error.set(invalido);
		this.error.set(null);
		this.subiendo.set(true);
		this.api.subir(pagoId, archivo).subscribe({
			next: (nuevo) => {
				this.adjuntos.update((lista) => [nuevo, ...lista]);
				this.subiendo.set(false);
				alSubir?.();
			},
			error: (err: unknown) => {
				logger.error('[PagoAdjuntosFacade] Error al subir el voucher', err);
				this.error.set(mensajeAdjuntoError(err, 'adjuntar el voucher'));
				this.subiendo.set(false);
			},
		});
	}

	/**
	 * Abre el archivo en otra pestaña. La pestaña se abre **antes** de la petición (dentro del gesto del clic) porque un
	 * `window.open` posterior a una respuesta HTTP lo bloquean los navegadores móviles; si igual no se abre, se descarga.
	 */
	ver(adjunto: PagoAdjunto): void {
		const ventana = typeof window !== 'undefined' ? window.open('', '_blank') : null;
		this.traer(
			adjunto,
			({ blob, fileName }) => {
				if (!ventana) return downloadBlob(blob, fileName);
				const url = window.URL.createObjectURL(blob);
				ventana.location.href = url;
				setTimeout(() => window.URL.revokeObjectURL(url), VIDA_URL_MS);
			},
			() => ventana?.close(),
		);
	}

	descargar(adjunto: PagoAdjunto): void {
		this.traer(adjunto, ({ blob, fileName }) => downloadBlob(blob, fileName));
	}

	darDeBaja(adjunto: PagoAdjunto, motivo: string, alTerminar: () => void): void {
		const pagoId = this.pagoId;
		const texto = motivo.trim();
		if (pagoId === null || this.ocupado()) return;
		if (this.sinConexion()) return void this.error.set(TEXTO_SIN_CONEXION);
		if (!texto) return void this.error.set(MENSAJES_POR_CODIGO['PAGO_ADJUNTO_MOTIVO_BAJA_REQUERIDO']);
		this.error.set(null);
		this.procesandoId.set(adjunto.id);
		this.api.darDeBaja(pagoId, adjunto.id, texto).subscribe({
			next: () => {
				this.procesandoId.set(null);
				alTerminar();
				this.cargar(pagoId);
			},
			error: (err: unknown) => {
				logger.error('[PagoAdjuntosFacade] Error al dar de baja el voucher', err);
				this.error.set(mensajeAdjuntoError(err, 'dar de baja el voucher'));
				this.procesandoId.set(null);
			},
		});
	}

	/** Valida al elegir el archivo (antes de mostrar la vista previa). El motivo queda en `error`. */
	validar(archivo: File): boolean {
		const motivo = validarArchivoAdjunto(archivo, this.activos().length);
		this.error.set(motivo);
		return motivo === null;
	}

	limpiarError(): void {
		this.error.set(null);
	}

	private traer(adjunto: PagoAdjunto, alRecibir: (archivo: PagoAdjuntoArchivo) => void, alFallar?: () => void): void {
		const pagoId = this.pagoId;
		if (pagoId === null || this.ocupado()) return void alFallar?.();
		if (this.sinConexion()) {
			this.error.set(TEXTO_SIN_CONEXION);
			return void alFallar?.();
		}
		this.error.set(null);
		this.procesandoId.set(adjunto.id);
		this.api.descargar(pagoId, adjunto.id, adjunto.nombreOriginal).subscribe({
			next: (archivo) => {
				alRecibir(archivo);
				this.procesandoId.set(null);
			},
			error: (err: unknown) => {
				logger.error('[PagoAdjuntosFacade] Error al traer el voucher', err);
				this.error.set(mensajeAdjuntoError(err, 'abrir el voucher'));
				this.procesandoId.set(null);
				alFallar?.();
			},
		});
	}
}
