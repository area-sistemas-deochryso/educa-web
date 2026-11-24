// #region Imports
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import type { CuotaCronograma } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import {
	type ErrorHttpLike,
	isoLocal,
	mensajeDeError,
	requiereRelectura,
} from '../utils/carga-inicial.logic';
import {
	type BorradorCronograma,
	type FilaCuota,
	conEtiqueta,
	conFecha,
	filasCronograma,
	hayCambiosCronograma,
	motivoNoRevisarCronograma,
	rellenarFechas,
} from './cronograma-anio.logic';
import {
	type RevisionCronograma,
	TEXTOS_CRONOGRAMA,
	armarRevisionCronograma,
	mensajeGuardadoCronograma,
} from './cronograma-resumen.logic';
import type { EstadoCarga, MensajeSeccion } from './seccion.logic';
// #endregion

/**
 * Cronograma de las 10 cuotas de pensión del año (P123 F2, INV-PG05). Se provee en `ConfigurarAnioComponent`.
 * - `server-confirmed`: la base es lo último que devolvió el servidor, con el `rowVersion` de cada cuota (INV-S05).
 * - Borrador disperso (solo lo tocado, D3); se envían siempre las 10 cuotas: el cronograma se reemplaza entero.
 * - Del PUT toma solo `cronograma`: adoptar los conceptos pisaría la concurrencia de la sección de montos.
 * - 409, sin respuesta, timeout o 5xx → relee una vez y conserva lo escrito; un 400 de regla no relee. Sin reintentos.
 * - El PUT no se ata al ciclo de vida (C24): cortarlo al salir cancelaría la petición a mitad de camino y dejaría
 *   incierto qué se guardó. Salir con cambios sin guardar ya lo pregunta el guard de la ruta.
 * - Solo la última lectura pedida toca el estado: una respuesta vieja del mismo año (2027 → 2026 → 2027) no pisa la
 *   vigente.
 */
@Injectable()
export class CronogramaAnioFacade {
	private readonly api = inject(PagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado
	private readonly _anio = signal<number | null>(null);
	private readonly _estado = signal<EstadoCarga>('cargando');
	private readonly _cuotas = signal<readonly CuotaCronograma[]>([]);
	private readonly _borrador = signal<BorradorCronograma>({});
	private readonly _revision = signal<RevisionCronograma | null>(null);
	private readonly _guardando = signal(false);
	private readonly _releyendo = signal(false);
	private readonly _baseIncierta = signal(false);
	private readonly _mensaje = signal<MensajeSeccion | null>(null);
	private lecturaId = 0;

	readonly estado = this._estado.asReadonly();
	readonly cuotas = this._cuotas.asReadonly();
	readonly revision = this._revision.asReadonly();
	readonly guardando = this._guardando.asReadonly();
	readonly releyendo = this._releyendo.asReadonly();
	readonly baseIncierta = this._baseIncierta.asReadonly();
	readonly mensaje = this._mensaje.asReadonly();
	// #endregion

	// #region Derivados
	readonly filas = computed(() =>
		filasCronograma(this._anio() ?? 0, this._cuotas(), this._borrador()),
	);
	/** Una etiqueta sugerida que nadie tocó no cuenta como cambio. */
	readonly hayCambios = computed(() => hayCambiosCronograma(this.filas()));
	readonly existe = computed(() => this._cuotas().length > 0);
	readonly hayFechasVacias = computed(() => this.filas().some((f) => f.fecha === ''));
	readonly ocupado = computed(() => this._guardando() || this._releyendo());
	readonly motivoNoRevisar = computed(() =>
		this._estado() === 'lista'
			? motivoNoRevisarCronograma(this.filas(), this._baseIncierta())
			: null,
	);
	readonly puedeRevisar = computed(
		() =>
			this.editable() &&
			!this._baseIncierta() &&
			this.hayCambios() &&
			this.motivoNoRevisar() === null,
	);
	// #endregion

	// #region Lectura
	/** Año nuevo: descarta el borrador, la revisión y los mensajes del anterior. */
	cargar(anio: number): void {
		const id = ++this.lecturaId;
		this._anio.set(anio);
		this._estado.set('cargando');
		this._cuotas.set([]);
		this._borrador.set({});
		this._revision.set(null);
		this._guardando.set(false);
		this._releyendo.set(false);
		this._baseIncierta.set(false);
		this._mensaje.set(null);
		this.api
			.configuracionAnio(anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cfg) => {
					if (id !== this.lecturaId) return;
					this._cuotas.set(cfg.cronograma);
					this._estado.set('lista');
				},
				error: (err: ErrorHttpLike) => {
					if (id !== this.lecturaId) return;
					logger.error('[CronogramaAnioFacade] Error al cargar el cronograma', err);
					this._estado.set('error');
					this._mensaje.set({
						severidad: 'danger',
						texto: mensajeDeError(err, 'cargar-cronograma'),
					});
				},
			});
	}

	recargar(): void {
		const anio = this._anio();
		if (anio !== null) this.cargar(anio);
	}

	/** Tras una relectura fallida: la base vuelve a ser la del servidor sin perder lo escrito. */
	volverALeer(): void {
		this.releer(null);
	}
	// #endregion

	// #region Edición
	editarEtiqueta(numero: number, texto: string): void {
		const fila = this.filaEditable(numero);
		if (!fila) return;
		this._borrador.update((b) => conEtiqueta(b, fila, texto));
		this.limpiarExito();
	}

	editarFecha(numero: number, iso: string): void {
		const fila = this.filaEditable(numero);
		if (!fila) return;
		this._borrador.update((b) => conFecha(b, fila, iso));
		this.limpiarExito();
	}

	/** Completa solo las fechas vacías con la fecha habitual; lo ya escrito no se pisa (U4). */
	proponerFechas(): void {
		const anio = this._anio();
		if (anio === null || !this.editable()) return;
		this._borrador.update((b) => rellenarFechas(anio, this.filas(), b));
		this.limpiarExito();
	}

	descartar(): void {
		if (this.ocupado()) return;
		this._borrador.set({});
		this._revision.set(null);
		this._mensaje.set(null);
	}
	// #endregion

	// #region Revisión y guardado
	/** Congela el payload de las 10 cuotas y su resumen: lo que se ve en la revisión es lo que viaja. */
	revisar(): boolean {
		const anio = this._anio();
		if (anio === null || !this.puedeRevisar()) return false;
		this._revision.set(armarRevisionCronograma(anio, this.filas(), isoLocal(new Date())));
		this._mensaje.set(null);
		return true;
	}

	volverAEditar(): void {
		if (this._guardando()) return;
		this._revision.set(null);
	}

	/** Envía la revisión congelada. Un segundo envío mientras hay uno en curso se ignora. */
	guardar(): void {
		const revision = this._revision();
		const anio = this._anio();
		if (!revision || anio === null || this._guardando()) return;
		this._guardando.set(true);
		this._mensaje.set(null);
		// eslint-disable-next-line wal/no-direct-mutation-subscribe -- Razón: cronograma admin-only, server-confirmed tras un resumen; las 10 cuotas llevan su rowVersion (INV-S05) y el BE valida todo o nada (INV-PG05), así que encolarlo offline lo reaplicaría con versiones viejas. Si falla, se relee y la persona vuelve a revisar.
		this.api.guardarCronogramaAnio(revision.payload).subscribe({
			next: (cfg) => {
				if (this._anio() !== anio) return;
				this._guardando.set(false);
				this._cuotas.set(cfg.cronograma);
				this._borrador.set({});
				this._revision.set(null);
				this._mensaje.set({
					severidad: 'success',
					texto: mensajeGuardadoCronograma(
						revision.creacion,
						anio,
						revision.resumen.cambiaFechas,
					),
				});
			},
			error: (err: ErrorHttpLike) => {
				if (this._anio() !== anio) return;
				logger.error('[CronogramaAnioFacade] Error al guardar el cronograma', err);
				this._guardando.set(false);
				this._revision.set(null);
				if (requiereRelectura(err)) {
					this.releer(err);
					return;
				}
				this._mensaje.set({
					severidad: 'danger',
					texto: mensajeDeError(err, 'guardar-cronograma'),
				});
			},
		});
	}

	/**
	 * Relee una vez y conserva el borrador sobre la base nueva. Si había algo escrito y ya no quedan diferencias, estaba
	 * guardado; sin nada escrito (por ejemplo, «Volver a leer» después de descartar) no hay qué confirmar. Con
	 * diferencias, el mensaje del error ya describe el estado real (el PUT es todo o nada). Nunca reintenta el PUT.
	 */
	private releer(err: ErrorHttpLike | null): void {
		const anio = this._anio();
		if (anio === null || this._releyendo()) return;
		const id = ++this.lecturaId;
		this._releyendo.set(true);
		this.api
			.configuracionAnio(anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cfg) => {
					if (id !== this.lecturaId) return;
					// Antes de cambiar la base: compara lo escrito con la base sobre la que se escribió.
					const habiaCambios = this.hayCambios();
					this._releyendo.set(false);
					this._baseIncierta.set(false);
					this._cuotas.set(cfg.cronograma);
					if (!this.hayCambios()) {
						this._borrador.set({});
						this._mensaje.set(
							habiaCambios
								? { severidad: 'success', texto: TEXTOS_CRONOGRAMA.yaGuardado }
								: null,
						);
						return;
					}
					this._mensaje.set(
						err
							? {
									severidad: 'danger',
									texto: mensajeDeError(err, 'guardar-cronograma'),
								}
							: { severidad: 'info', texto: TEXTOS_CRONOGRAMA.releido },
					);
				},
				error: (e: ErrorHttpLike) => {
					if (id !== this.lecturaId) return;
					logger.error('[CronogramaAnioFacade] Error al releer el cronograma', e);
					this._releyendo.set(false);
					this._baseIncierta.set(true);
					this._mensaje.set({
						severidad: 'danger',
						texto: TEXTOS_CRONOGRAMA.sinConfirmar,
					});
				},
			});
	}
	// #endregion

	// #region Helpers
	private editable(): boolean {
		return this._estado() === 'lista' && !this.ocupado() && this._revision() === null;
	}

	private filaEditable(numero: number): FilaCuota | null {
		if (!this.editable()) return null;
		return this.filas().find((f) => f.numero === numero) ?? null;
	}

	/** Seguir editando después de guardar deja viejo el «se guardó»; los avisos de error se quedan. */
	private limpiarExito(): void {
		if (this._mensaje()?.severidad === 'success') this._mensaje.set(null);
	}
	// #endregion
}
