// #region Imports
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';

import { logger } from '@core/helpers';
import type { EstudianteBusqueda, MiembroFamilia, PagoMedio, RepartoAplicacion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import {
	type IntentoPago,
	armarPayload,
	claveParaEnvio,
	diferenciaCentavos,
	huellaDe,
	esIdempotenciaEnCurso,
	mensajeDeError,
	repartoCuadra,
	resultadoDesconocido,
} from './registrar-pago.logic';
// #endregion

export interface DatosPago {
	monto: number;
	fechaPago: string;
	horaPago: string | null;
	medio: PagoMedio;
	bancoOrigen: string | null;
	numeroOperacion: string | null;
	comprobante: string;
	observaciones: string | null;
}

/**
 * Estado de «Registrar pago». Se provee a nivel de componente.
 * - El alumno que paga se elige con el buscador o llega por la ruta (`?estudianteId=`, desde «Quiénes deben»).
 * - El reparto lo propone el servidor y la persona lo edita; el cliente debe cuadrar con el monto antes de enviar.
 * - Un intento = una clave de idempotencia. Se reusa solo si el resultado es desconocido (sin respuesta o
 *   `409 IDEMPOTENCIA_EN_CURSO`) y el payload no cambió.
 */
@Injectable()
export class RegistrarPagoFacade {
	private readonly api = inject(PagosApiService);

	readonly estudiante = signal<{ id: number; nombre: string } | null>(null);
	readonly familia = signal<MiembroFamilia[]>([]);
	readonly seleccionados = signal<ReadonlySet<number>>(new Set());
	readonly loadingFamilia = signal(false);

	readonly reparto = signal<RepartoAplicacion[]>([]);
	readonly sobrante = signal(0);
	readonly loadingReparto = signal(false);
	readonly errorReparto = signal<string | null>(null);

	readonly guardando = signal(false);
	readonly errorRegistro = signal<string | null>(null);
	readonly pagoRegistrado = signal<number | null>(null);
	/** El último envío quedó `IDEMPOTENCIA_EN_CURSO`: la pantalla ofrece verificar el estado de cuenta. */
	readonly pagoEnCurso = signal(false);

	readonly sugerencias = signal<EstudianteBusqueda[]>([]);
	readonly errorBusqueda = signal<string | null>(null);

	private readonly destroyRef = inject(DestroyRef);
	private readonly consulta$ = new Subject<string>();
	private intento: IntentoPago | null = null;
	private reusarClave = false;

	readonly idsSeleccionados = computed(() => [...this.seleccionados()]);

	constructor() {
		// switchMap descarta la respuesta de la búsqueda anterior si ya hay una más nueva.
		this.consulta$
			.pipe(
				switchMap((texto) =>
					this.api.buscarEstudiantes(texto).pipe(
						catchError((err: unknown) => {
							logger.error('[RegistrarPagoFacade] Error al buscar alumnos', err);
							this.errorBusqueda.set('No se pudo buscar alumnos. Intentá de nuevo.');
							return of<EstudianteBusqueda[]>([]);
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((lista) => this.sugerencias.set(lista));
	}

	/** Busca por nombre o DNI. Con menos de 2 caracteres no consulta (el servidor lo rechaza). */
	buscarEstudiantes(texto: string): void {
		const limpio = texto.trim();
		if (limpio.length < 2) {
			this.sugerencias.set([]);
			return;
		}
		this.errorBusqueda.set(null);
		this.consulta$.next(limpio);
	}

	/** Fija el alumno que paga y carga su grupo familiar. Todos los del grupo arrancan seleccionados. */
	iniciar(estudiante: { id: number; nombre: string }): void {
		// Cambiar de alumno invalida el reparto, el resultado y el intento en curso.
		this.pagoRegistrado.set(null);
		this.limpiarReparto();
		this.intento = null;
		this.reusarClave = false;
		this.estudiante.set(estudiante);
		this.loadingFamilia.set(true);
		this.api.familia(estudiante.id).subscribe({
			next: (miembros) => {
				const lista = miembros.some((m) => m.estudianteId === estudiante.id)
					? miembros
					: [{ estudianteId: estudiante.id, nombreCompleto: estudiante.nombre }, ...miembros];
				this.familia.set(lista);
				this.seleccionados.set(new Set(lista.map((m) => m.estudianteId)));
				this.loadingFamilia.set(false);
			},
			error: (err: unknown) => {
				logger.error('[RegistrarPagoFacade] Error al cargar la familia', err);
				this.familia.set([{ estudianteId: estudiante.id, nombreCompleto: estudiante.nombre }]);
				this.seleccionados.set(new Set([estudiante.id]));
				this.loadingFamilia.set(false);
			},
		});
	}

	toggleMiembro(estudianteId: number): void {
		this.seleccionados.update((set) => {
			const next = new Set(set);
			if (!next.delete(estudianteId)) next.add(estudianteId);
			return next;
		});
		this.limpiarReparto();
	}

	/** Pide la propuesta de reparto al servidor. No persiste nada. */
	proponer(monto: number, fechaPago: string): void {
		const ids = this.idsSeleccionados();
		if (ids.length === 0 || monto <= 0) return;
		this.loadingReparto.set(true);
		this.errorReparto.set(null);
		this.limpiarRegistro();
		this.api.proponerReparto(monto, fechaPago, ids).subscribe({
			next: (propuesta) => {
				this.reparto.set(propuesta.aplicaciones);
				this.sobrante.set(propuesta.sobrante);
				this.loadingReparto.set(false);
			},
			error: (err: unknown) => {
				logger.error('[RegistrarPagoFacade] Error al proponer el reparto', err);
				this.errorReparto.set('No se pudo calcular el reparto. Intentá de nuevo.');
				this.loadingReparto.set(false);
			},
		});
	}

	/** Cambia el monto base o el recargo de una aplicación. El cuadre se recalcula en la vista. */
	editarAplicacion(index: number, campo: 'montoBase' | 'montoRecargo', valor: number): void {
		this.reparto.update((apps) =>
			apps.map((a, i) => (i === index ? { ...a, [campo]: Math.max(0, valor ?? 0) } : a)),
		);
		this.limpiarRegistro();
	}

	/** El error del intento anterior deja de aplicar cuando cambian los datos del pago. */
	descartarErrorRegistro(): void {
		this.limpiarRegistro();
	}

	/** Diferencia en centavos entre el monto del pago y el reparto. Cero = cuadra. */
	diferencia(monto: number): number {
		return diferenciaCentavos(monto, this.reparto());
	}

	puedeRegistrar(monto: number): boolean {
		return !this.guardando() && repartoCuadra(monto, this.reparto());
	}

	/** Envía el pago con el reparto confirmado. Un intento = una clave de idempotencia. */
	registrar(datos: DatosPago): void {
		if (!this.puedeRegistrar(datos.monto)) return;

		const payload = armarPayload({ ...datos, aplicaciones: this.reparto() });
		this.intento = claveParaEnvio(this.intento, huellaDe(payload), this.reusarClave);
		this.guardando.set(true);
		this.errorRegistro.set(null);
		this.pagoEnCurso.set(false);

		this.api.registrarPago(payload, this.intento.clave).subscribe({
			next: ({ id }) => {
				this.reusarClave = false;
				this.intento = null;
				this.pagoRegistrado.set(id);
				this.guardando.set(false);
			},
			error: (err: { status?: number; error?: { errorCode?: string } }) => {
				// Solo un resultado desconocido (sin respuesta o `IDEMPOTENCIA_EN_CURSO`) permite reusar la clave.
				this.reusarClave = resultadoDesconocido(err);
				if (!this.reusarClave) this.intento = null;
				this.pagoEnCurso.set(esIdempotenciaEnCurso(err));
				logger.error('[RegistrarPagoFacade] Error al registrar el pago', err);
				this.errorRegistro.set(mensajeDeError(err));
				this.guardando.set(false);
			},
		});
	}

	/** Vuelve a un formulario limpio para registrar otro pago del mismo alumno. */
	nuevoPago(): void {
		this.pagoRegistrado.set(null);
		this.limpiarReparto();
	}

	private limpiarReparto(): void {
		this.reparto.set([]);
		this.sobrante.set(0);
		this.errorReparto.set(null);
		this.limpiarRegistro();
	}

	private limpiarRegistro(): void {
		this.errorRegistro.set(null);
		this.pagoEnCurso.set(false);
	}
}
