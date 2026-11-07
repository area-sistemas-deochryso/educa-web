// #region Imports
import { Injectable, computed, inject, signal } from '@angular/core';

import { logger } from '@core/helpers';
import type { MiembroFamilia, PagoMedio, RepartoAplicacion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import {
	type IntentoPago,
	armarPayload,
	claveParaEnvio,
	diferenciaCentavos,
	huellaDe,
	mensajeDeError,
	repartoCuadra,
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
 * - El alumno que paga llega por la ruta (`?estudianteId=`). El buscador está pausado (decisión 1-A, gap G2).
 * - El reparto lo propone el servidor y la persona lo edita; el cliente debe cuadrar con el monto antes de enviar.
 * - Un intento = una clave de idempotencia. Se reusa solo si no hubo respuesta y el payload no cambió.
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

	private intento: IntentoPago | null = null;
	private sinRespuesta = false;

	readonly idsSeleccionados = computed(() => [...this.seleccionados()]);

	/** Fija el alumno que paga y carga su grupo familiar. Todos los del grupo arrancan seleccionados. */
	iniciar(estudiante: { id: number; nombre: string }): void {
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
		this.intento = claveParaEnvio(this.intento, huellaDe(payload), this.sinRespuesta);
		this.guardando.set(true);
		this.errorRegistro.set(null);

		this.api.registrarPago(payload, this.intento.clave).subscribe({
			next: ({ id }) => {
				this.sinRespuesta = false;
				this.intento = null;
				this.pagoRegistrado.set(id);
				this.guardando.set(false);
			},
			error: (err: { status?: number; error?: { errorCode?: string } }) => {
				// Solo la falta de respuesta (red o timeout) permite reusar la clave en el siguiente envío.
				this.sinRespuesta = err?.status === 0;
				if (!this.sinRespuesta) this.intento = null;
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
	}
}
