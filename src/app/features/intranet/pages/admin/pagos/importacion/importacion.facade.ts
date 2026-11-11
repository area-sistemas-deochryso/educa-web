// #region Imports
import { Injectable, computed, inject, signal } from '@angular/core';

import { logger } from '@core/helpers';
import { ExcelService } from '@core/services/excel';
import type { FilaImportacion, ResultadoImportacion, VistaPreviaImportacion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { type ErrorHttpLike, mensajeDeError, vistaPreviaDesactualizada } from '../utils/carga-inicial.logic';
import { COLUMNAS_PLANTILLA, FILAS_EJEMPLO, NOMBRE_PLANTILLA } from './importacion-plantilla';
import {
	HOJA_DATOS,
	type FilaLeida,
	armarFilasEnvio,
	armarFilasVista,
	leerFilas,
	normalizarClave,
} from './importacion.logic';
// #endregion

/**
 * Importación de saldos, pagos y descuentos (P119 F6c): archivo → vista previa → revisión por fila → confirmar.
 * Se provee a nivel de componente.
 * - El archivo se lee en el navegador; el BE solo recibe filas en JSON (E2) y nunca escribe en la vista previa.
 * - Resolver un alumno ambiguo reenvía toda la vista previa con `estudianteId`; descartar una fila la saca del envío.
 * - La confirmación viaja con `filasEsperadas` = `aplicables` de la vista previa. Si el BE responde `409` (el conteo
 *   cambió) no escribió nada: se recalcula la vista previa y la persona confirma de nuevo con el número nuevo.
 * - No hay una sola transacción en el BE: cada fila guarda por sí misma y las que fallan vuelven en `fallidas`.
 *   Reenviar el mismo archivo es seguro (lo aplicado sale `YA_EXISTE`).
 * - Sin reintentos: 4xx/429 nunca se reintentan. Tras un corte de red se recalcula la vista previa.
 */
@Injectable()
export class ImportacionFacade {
	private readonly api = inject(PagosApiService);
	private readonly excel = inject(ExcelService);

	readonly anio = signal(new Date().getFullYear());
	readonly archivo = signal<string | null>(null);
	readonly leidas = signal<FilaLeida[]>([]);
	readonly leyendo = signal(false);
	readonly errorLectura = signal<string | null>(null);

	readonly resueltas = signal<ReadonlyMap<number, number>>(new Map());
	readonly descartadas = signal<ReadonlySet<number>>(new Set());

	readonly vistaPrevia = signal<VistaPreviaImportacion | null>(null);
	readonly calculando = signal(false);
	readonly confirmando = signal(false);
	readonly error = signal<string | null>(null);
	readonly resultado = signal<ResultadoImportacion | null>(null);

	readonly filasVista = computed(() =>
		armarFilasVista(this.leidas(), this.vistaPrevia()?.filas ?? [], this.descartadas()),
	);
	readonly ocupado = computed(() => this.leyendo() || this.calculando() || this.confirmando());
	readonly puedeConfirmar = computed(() => (this.vistaPrevia()?.aplicables ?? 0) > 0 && !this.ocupado() && !this.resultado());

	descargarPlantilla(): void {
		void this.excel.exportToXlsx({
			sheetName: HOJA_DATOS,
			columns: COLUMNAS_PLANTILLA.map((c) => ({ header: c.header, key: c.key, width: c.width })),
			data: FILAS_EJEMPLO.map((f) => ({ ...f })),
			fileName: NOMBRE_PLANTILLA,
		});
	}

	/** Cambiar el año invalida la vista previa y el resultado: describen otro conjunto de cargos. */
	cambiarAnio(anio: number): void {
		if (this.ocupado()) return;
		this.anio.set(anio);
		this.resultado.set(null);
		this.vistaPrevia.set(null);
		this.error.set(null);
		if (this.leidas().length > 0) this.calcular();
	}

	async leerArchivo(file: File): Promise<void> {
		if (this.ocupado()) return;
		this.reiniciar();
		this.archivo.set(file.name);
		this.leyendo.set(true);
		try {
			const hojas = await this.excel.parseXlsx(await file.arrayBuffer());
			const hoja = hojas.find((h) => normalizarClave(h.sheetName) === normalizarClave(HOJA_DATOS)) ?? hojas[0];
			const lectura = leerFilas(hoja?.data ?? []);
			if (!lectura.ok) {
				this.errorLectura.set(lectura.mensaje);
				return;
			}
			this.leidas.set(lectura.filas);
		} catch (err) {
			logger.error('[ImportacionFacade] Error al leer el archivo', err);
			this.errorLectura.set('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx) y vuelve a intentarlo.');
		} finally {
			this.leyendo.set(false);
		}
		if (this.leidas().length > 0) this.calcular();
	}

	/** Vuelve al estado inicial: sin archivo, sin vista previa y sin resultado. El año elegido se conserva. */
	reiniciar(): void {
		this.archivo.set(null);
		this.leidas.set([]);
		this.errorLectura.set(null);
		this.resueltas.set(new Map());
		this.descartadas.set(new Set());
		this.vistaPrevia.set(null);
		this.resultado.set(null);
		this.error.set(null);
	}

	/** Evalúa todas las filas legibles. `aviso` se conserva como error visible (lo usa el `409`). */
	calcular(aviso: string | null = null): void {
		if (this.calculando() || this.confirmando()) return;
		const filas = this.filasEnvio();
		this.error.set(aviso);
		this.resultado.set(null);
		if (filas.length === 0) {
			this.vistaPrevia.set(null);
			return;
		}
		this.calculando.set(true);
		this.api.vistaPreviaImportacion({ anio: this.anio(), filas }).subscribe({
			next: (vp) => {
				this.vistaPrevia.set(vp);
				this.calculando.set(false);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[ImportacionFacade] Error en la vista previa', err);
				this.vistaPrevia.set(null);
				this.error.set(mensajeDeError(err, 'importar-vista-previa'));
				this.calculando.set(false);
			},
		});
	}

	/** La persona eligió el alumno de una fila ambigua: se reenvía la vista previa con ese `estudianteId`. */
	resolver(numero: number, estudianteId: number): void {
		if (this.ocupado()) return;
		this.resueltas.update((m) => new Map(m).set(numero, estudianteId));
		this.calcular();
	}

	/** Una fila descartada no se manda. Solo se descartan filas sin resolver, que no cuentan en `aplicables`. */
	descartar(numero: number): void {
		if (this.ocupado()) return;
		this.descartadas.update((s) => new Set(s).add(numero));
	}

	confirmar(): void {
		const vp = this.vistaPrevia();
		if (!vp || !this.puedeConfirmar()) return;
		this.confirmando.set(true);
		this.error.set(null);
		// eslint-disable-next-line wal/no-direct-mutation-subscribe -- Razón: importación admin-only, server-confirmed; exige la vista previa vigente (`filasEsperadas`), así que NO debe encolarse offline ni reaplicarse tarde. Si falla, la persona ve el error y recalcula.
		this.api.confirmarImportacion({ anio: this.anio(), filas: this.filasEnvio(), filasEsperadas: vp.aplicables }).subscribe({
			next: (res) => {
				this.confirmando.set(false);
				this.vistaPrevia.set(null);
				this.resultado.set(res);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[ImportacionFacade] Error al confirmar la importación', err);
				this.confirmando.set(false);
				const mensaje = mensajeDeError(err, 'importar-confirmar');
				if (vistaPreviaDesactualizada(err) || err.status === 0) {
					// El conteo mostrado ya no es el real (o no se sabe): se recalcula y se conserva el aviso.
					this.calcular(mensaje);
					return;
				}
				this.error.set(mensaje);
			},
		});
	}

	private filasEnvio(): FilaImportacion[] {
		return armarFilasEnvio(this.leidas(), { resueltas: this.resueltas(), descartadas: this.descartadas() });
	}
}
