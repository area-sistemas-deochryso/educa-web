import {
	Component,
	ChangeDetectionStrategy,
	computed,
	input,
	output,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CalificacionConNotasDto, esNotaEditable } from '../../../models';

// #region Interfaces
interface GridCell {
	calificacionId: number;
	estudianteId: number;
	nota: number | null;
	editable: boolean;
	colorClass: string;
}

interface GridRow {
	estudianteId: number;
	nombre: string;
	cells: GridCell[];
	promedio: string;
	avgClass: string;
}
// #endregion

@Component({
	selector: 'app-calificaciones-grid',
	standalone: true,
	imports: [CommonModule, TableModule, DecimalPipe],
	templateUrl: './calificaciones-grid.component.html',
	styleUrl: './calificaciones-grid.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalificacionesGridComponent {
	// #region Inputs / Outputs
	readonly calificaciones = input.required<CalificacionConNotasDto[]>();
	readonly estudiantes = input.required<{ id: number; nombre: string }[]>();
	readonly saving = input<boolean>(false);

	readonly notaChange = output<{
		calificacionId: number;
		estudianteId: number;
		nota: number | null;
	}>();
	// #endregion

	// #region Computed
	readonly rows = computed<GridRow[]>(() => {
		const cals = this.calificaciones();
		const estudiantes = this.estudiantes();

		return estudiantes.map((est) => {
			const cells: GridCell[] = cals.map((cal) => {
				const notaDto = cal.notas.find((n) => n.estudianteId === est.id);
				const nota = notaDto?.nota ?? null;
				const editable = esNotaEditable(cal.fechaEvaluacion);

				return {
					calificacionId: cal.id,
					estudianteId: est.id,
					nota,
					editable,
					colorClass: this.getNotaColorClass(nota),
				};
			});

			const { promedio, avgClass } = this.calcularPromedio(cells, cals);

			return {
				estudianteId: est.id,
				nombre: est.nombre,
				cells,
				promedio,
				avgClass,
			};
		});
	});

	readonly totalColumns = computed(() => this.calificaciones().length + 3);
	// #endregion

	// #region Event handlers
	onCellBlur(event: Event, cell: GridCell): void {
		const input = event.target as HTMLInputElement;
		const rawValue = input.value.trim();

		if (rawValue === '') {
			// Empty input, skip
			return;
		}

		const newNota = parseFloat(rawValue);

		if (isNaN(newNota) || newNota < 0 || newNota > 20) {
			// Revert to original value
			input.value = cell.nota !== null ? String(cell.nota) : '';
			return;
		}

		// Round to nearest 0.5
		const rounded = Math.round(newNota * 2) / 2;

		if (rounded !== cell.nota) {
			this.notaChange.emit({
				calificacionId: cell.calificacionId,
				estudianteId: cell.estudianteId,
				nota: rounded,
			});
		}
	}
	// #endregion

	// #region Helpers privados
	private getNotaColorClass(nota: number | null): string {
		if (nota === null) return '';
		if (nota >= 14) return 'grade-high';
		if (nota >= 11) return 'grade-mid';
		return 'grade-low';
	}

	private calcularPromedio(
		cells: GridCell[],
		cals: CalificacionConNotasDto[],
	): { promedio: string; avgClass: string } {
		let sumPonderado = 0;
		let sumPesos = 0;

		for (let i = 0; i < cells.length; i++) {
			if (cells[i].nota !== null) {
				sumPonderado += cells[i].nota! * cals[i].peso;
				sumPesos += cals[i].peso;
			}
		}

		if (sumPesos === 0) {
			return { promedio: '-', avgClass: '' };
		}

		const avg = sumPonderado / sumPesos;
		const rounded = Math.round(avg * 10) / 10;

		return {
			promedio: rounded.toFixed(1),
			avgClass: this.getNotaColorClass(rounded),
		};
	}
	// #endregion
}
