import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { extractBackendMessage, formatDateLocalIso, logger } from '@core/helpers';
import { EduButton, EduDatePicker, EduDialog } from '@edu-ui';
import { AttendanceReportsFacade } from '../../services';
import { isoToCorto, isoToLocalDate, validarEdicion, type BimestreAsistencia } from '../../models';

interface FilaBimestre {
	original: BimestreAsistencia;
	inicio: Date | null;
	fin: Date | null;
	saving: boolean;
	/** Error devuelto por el BE (409 de concurrencia, solape que el cliente no vio, etc.). */
	errorServidor: string;
}

/**
 * Diálogo "Configurar bimestres" (Plan xrepo-116 F2): edita el rango de fechas de cada bimestre del año.
 * Cada fila se guarda sola y se valida contra los **otros bimestres ya guardados** (misma regla que el BE,
 * INV-RE05). Para mover el límite entre dos bimestres hay que acortar uno y luego extender el otro.
 * No crea ni borra bimestres: un año nuevo lo siembra el script SQL.
 */
@Component({
	selector: 'app-bimestres-config-dialog',
	standalone: true,
	imports: [FormsModule, EduButton, EduDatePicker, EduDialog],
	templateUrl: './bimestres-config-dialog.component.html',
	styleUrl: './bimestres-config-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BimestresConfigDialogComponent {
	private readonly facade = inject(AttendanceReportsFacade);

	// #region Inputs
	readonly visible = model<boolean>(false);
	readonly bimestres = input.required<BimestreAsistencia[]>();
	readonly anio = input.required<number>();
	// #endregion

	// #region Estado
	readonly filas = signal<FilaBimestre[]>([]);

	constructor() {
		// Se reconstruye al abrir y cuando la lista guardada cambia (tras guardar una fila).
		effect(() => {
			const lista = this.bimestres();
			if (!this.visible()) return;
			this.filas.set(
				lista.map((b) => ({
					original: b,
					inicio: isoToLocalDate(b.fechaInicio),
					fin: isoToLocalDate(b.fechaFin),
					saving: false,
					errorServidor: '',
				})),
			);
		});
	}
	// #endregion

	// #region Computed
	/** Mensaje de validación local por `id` (vacío = válido). */
	readonly errores = computed<Record<number, string>>(() => {
		const lista = this.bimestres();
		const result: Record<number, string> = {};
		for (const fila of this.filas()) {
			const otros = lista.filter((b) => b.id !== fila.original.id);
			result[fila.original.id] = validarEdicion({ fechaInicio: fila.inicio, fechaFin: fila.fin }, this.anio(), otros);
		}
		return result;
	});
	// #endregion

	// #region Helpers de template
	hayCambios(fila: FilaBimestre): boolean {
		return (
			fila.inicio !== null
			&& fila.fin !== null
			&& (formatDateLocalIso(fila.inicio) !== fila.original.fechaInicio.slice(0, 10)
				|| formatDateLocalIso(fila.fin) !== fila.original.fechaFin.slice(0, 10))
		);
	}

	rangoGuardado(fila: FilaBimestre): string {
		return `${isoToCorto(fila.original.fechaInicio)} al ${isoToCorto(fila.original.fechaFin)}`;
	}

	diasDe(fila: FilaBimestre): number {
		if (!fila.inicio || !fila.fin) return 0;
		return Math.round((fila.fin.getTime() - fila.inicio.getTime()) / 86_400_000) + 1;
	}
	// #endregion

	// #region Handlers
	onCambioFecha(fila: FilaBimestre, campo: 'inicio' | 'fin', valor: Date | null): void {
		this.filas.update((filas) =>
			filas.map((f) => (f === fila ? { ...f, [campo]: valor, errorServidor: '' } : f)),
		);
	}

	onGuardar(fila: FilaBimestre): void {
		if (!fila.inicio || !fila.fin || this.errores()[fila.original.id] || fila.saving) return;
		this.setSaving(fila.original.id, true);

		this.facade
			.actualizarBimestre(fila.original.id, {
				fechaInicio: formatDateLocalIso(fila.inicio),
				fechaFin: formatDateLocalIso(fila.fin),
				rowVersion: fila.original.rowVersion,
			})
			.subscribe({
				// La lista guardada se actualiza en el store; el effect reconstruye las filas.
				next: () => this.setSaving(fila.original.id, false),
				error: (err) => {
					logger.error('[BimestresConfig] Error al guardar bimestre', err);
					this.filas.update((filas) =>
						filas.map((f) =>
							f.original.id === fila.original.id
								? { ...f, saving: false, errorServidor: extractBackendMessage(err) ?? 'No se pudo guardar el bimestre.' }
								: f,
						),
					);
				},
			});
	}

	onCerrar(): void {
		this.visible.set(false);
	}

	private setSaving(id: number, saving: boolean): void {
		this.filas.update((filas) => filas.map((f) => (f.original.id === id ? { ...f, saving } : f)));
	}
	// #endregion
}
