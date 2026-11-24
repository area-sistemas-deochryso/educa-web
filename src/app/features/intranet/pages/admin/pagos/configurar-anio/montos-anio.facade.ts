// #region Imports
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import type { ConceptoConMontos } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import {
	type ErrorHttpLike,
	mensajeDeError,
	requiereRelectura,
} from '../utils/carga-inicial.logic';
import {
	type BorradorMontos,
	cambiosMontos,
	cantidadErroresMontos,
	coberturaMontos,
	conTexto,
	filasMontos,
	hayCambiosMontos,
	motivoNoRevisarMontos,
} from './montos-anio.logic';
import {
	type RevisionMontos,
	TEXTOS_MONTOS,
	armarRevisionMontos,
	borradorSobreConceptos,
	mensajeGuardadoMontos,
	mensajeTrasRelectura,
	relecturaConfirmaGuardado,
} from './montos-resumen.logic';
import type { EstadoCarga, MensajeSeccion } from './seccion.logic';
// #endregion

/**
 * Montos por concepto y nivel del año (P123 F2, INV-PG06). Se provee en `ConfigurarAnioComponent`.
 * - `server-confirmed`: la base es lo último que devolvió el servidor, con el `rowVersion` de cada fila (INV-S05).
 * - Borrador disperso (solo lo tocado); se envía solo lo nuevo o cambiado: el BE valida la versión de cada fila enviada.
 * - Del PUT toma solo `conceptos`: adoptar el cronograma pisaría la concurrencia de la otra sección.
 * - 409, sin respuesta, timeout, 5xx o concepto desactivado → relee una vez y conserva lo escrito; un 400 de regla no
 *   relee. Sin reintentos.
 * - Solo la última lectura pedida toca el estado: una respuesta vieja del mismo año (2027 → 2026 → 2027) no pisa la
 *   vigente.
 */
@Injectable()
export class MontosAnioFacade {
	private readonly api = inject(PagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado
	private readonly _anio = signal<number | null>(null);
	private readonly _estado = signal<EstadoCarga>('cargando');
	private readonly _conceptos = signal<readonly ConceptoConMontos[]>([]);
	private readonly _borrador = signal<BorradorMontos>({});
	private readonly _revision = signal<RevisionMontos | null>(null);
	private readonly _guardando = signal(false);
	private readonly _releyendo = signal(false);
	private readonly _baseIncierta = signal(false);
	private readonly _mensaje = signal<MensajeSeccion | null>(null);
	private lecturaId = 0;

	readonly estado = this._estado.asReadonly();
	readonly conceptos = this._conceptos.asReadonly();
	readonly revision = this._revision.asReadonly();
	readonly guardando = this._guardando.asReadonly();
	readonly releyendo = this._releyendo.asReadonly();
	readonly baseIncierta = this._baseIncierta.asReadonly();
	readonly mensaje = this._mensaje.asReadonly();
	// #endregion

	// #region Derivados
	readonly filas = computed(() => filasMontos(this._conceptos(), this._borrador()));
	readonly cambios = computed(() => cambiosMontos(this.filas()));
	readonly errores = computed(() => cantidadErroresMontos(this.filas()));
	readonly hayCambios = computed(() => hayCambiosMontos(this.filas()));
	readonly cobertura = computed(() => coberturaMontos(this._conceptos()));
	readonly ocupado = computed(() => this._guardando() || this._releyendo());
	readonly motivoNoRevisar = computed(() =>
		this._estado() === 'lista'
			? motivoNoRevisarMontos(this.errores(), this._baseIncierta())
			: null,
	);
	readonly puedeRevisar = computed(
		() =>
			this._estado() === 'lista' &&
			!this._baseIncierta() &&
			!this.ocupado() &&
			this._revision() === null &&
			this.cambios().length > 0 &&
			this.errores() === 0,
	);
	// #endregion

	constructor() {
		// El PUT no se corta al salir (ver `guardar`): sin año, una respuesta tardía ya no toca el estado ni relee.
		this.destroyRef.onDestroy(() => this._anio.set(null));
	}

	// #region Lectura
	/** Otro año descarta el borrador: el padre ya preguntó si había cambios sin guardar. */
	cargar(anio: number): void {
		const id = ++this.lecturaId;
		this._anio.set(anio);
		this._estado.set('cargando');
		this._conceptos.set([]);
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
					this._conceptos.set(cfg.conceptos);
					this._estado.set('lista');
				},
				error: (err: ErrorHttpLike) => {
					if (id !== this.lecturaId) return;
					logger.error('[MontosAnioFacade] Error al cargar los montos', err);
					this._estado.set('error');
					this._mensaje.set({
						severidad: 'danger',
						texto: mensajeDeError(err, 'cargar-montos'),
					});
				},
			});
	}

	recargar(): void {
		const anio = this._anio();
		if (anio !== null) this.cargar(anio);
	}
	// #endregion

	// #region Edición
	editar(clave: string, texto: string): void {
		if (this._estado() !== 'lista' || this.ocupado() || this._revision() !== null) return;
		const celda = this.filas()
			.flatMap((f) => f.celdas)
			.find((c) => c.clave === clave);
		if (!celda) return;
		this._borrador.update((b) => conTexto(b, celda, texto));
		if (this._mensaje()?.severidad === 'success') this._mensaje.set(null);
	}

	descartar(): void {
		if (this.ocupado()) return;
		this._borrador.set({});
		this._revision.set(null);
		this._mensaje.set(null);
	}
	// #endregion

	// #region Revisar y guardar
	/** Congela el payload y su resumen: lo que la persona confirma es exactamente lo que viaja. */
	revisar(): boolean {
		const anio = this._anio();
		if (anio === null || !this.puedeRevisar()) return false;
		this._revision.set(armarRevisionMontos(anio, this.cambios()));
		this._mensaje.set(null);
		return true;
	}

	volverAEditar(): void {
		if (this._guardando()) return;
		this._revision.set(null);
	}

	/**
	 * Envía la revisión congelada. Si sale bien, la respuesta es la nueva base y el borrador se vacía. Si falla, se
	 * vuelve al editor con lo escrito: un resultado incierto, un `409` o un concepto desactivado obligan a releer antes
	 * de volver a guardar; un `400` de regla solo se informa.
	 */
	guardar(): void {
		const revision = this._revision();
		const anio = this._anio();
		if (!revision || anio === null || this._guardando()) return;
		this._guardando.set(true);
		this._mensaje.set(null);
		// Sin `takeUntilDestroyed` a propósito: cortar el PUT al salir dejaría sin saber qué se guardó, y el guard de
		// ruta ya pregunta antes de salir con cambios sin guardar.
		// eslint-disable-next-line wal/no-direct-mutation-subscribe -- Razón: montos del año admin-only, server-confirmed tras un resumen; cada fila lleva su rowVersion (INV-S05) y el BE valida todo o nada (INV-PG06), así que encolarlos offline los reaplicaría con versiones viejas. Si falla, se relee y la persona vuelve a revisar.
		this.api.guardarMontosAnio(revision.payload).subscribe({
			next: (cfg) => {
				if (this._anio() !== anio) return;
				this._guardando.set(false);
				this._conceptos.set(cfg.conceptos);
				this._borrador.set({});
				this._revision.set(null);
				this._mensaje.set({
					severidad: 'success',
					texto: mensajeGuardadoMontos(revision.cantidad),
				});
			},
			error: (err: ErrorHttpLike) => {
				if (this._anio() !== anio) return;
				logger.error('[MontosAnioFacade] Error al guardar los montos', err);
				this._guardando.set(false);
				this._revision.set(null);
				if (requiereRelectura(err)) {
					this.releer(err);
					return;
				}
				this._mensaje.set({
					severidad: 'danger',
					texto: mensajeDeError(err, 'guardar-montos'),
				});
			},
		});
	}

	/** Tras una relectura fallida la base sigue incierta: la persona la pide de nuevo. */
	volverALeer(): void {
		this.releer(null);
	}

	/**
	 * Relee una vez y conserva lo escrito sobre la base nueva; nunca reintenta el PUT (INV-S05). Lo escrito para un
	 * concepto que se desactivó se descarta y se nombra. Si había algo escrito y ya no quedan diferencias, estaba
	 * guardado; sin nada escrito (por ejemplo, «Volver a leer» después de descartar) no hay qué confirmar.
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
					const releido = borradorSobreConceptos(
						this._borrador(),
						this._conceptos(),
						cfg.conceptos,
					);
					this._releyendo.set(false);
					this._baseIncierta.set(false);
					this._conceptos.set(cfg.conceptos);
					this._borrador.set(releido.borrador);
					const quedanCambios = this.hayCambios();
					if (relecturaConfirmaGuardado(err, habiaCambios, quedanCambios, releido.descartados)) {
						this._borrador.set({});
						this._mensaje.set({
							severidad: 'success',
							texto: TEXTOS_MONTOS.yaGuardados,
						});
						return;
					}
					this._mensaje.set(mensajeTrasRelectura(err, habiaCambios, releido.descartados));
				},
				error: (e: ErrorHttpLike) => {
					if (id !== this.lecturaId) return;
					logger.error('[MontosAnioFacade] Error al releer los montos', e);
					this._releyendo.set(false);
					this._baseIncierta.set(true);
					this._mensaje.set({ severidad: 'danger', texto: TEXTOS_MONTOS.sinConfirmar });
				},
			});
	}
	// #endregion
}
