import { Component, ChangeDetectionStrategy, input, output, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import {
	MiAsistenciaCursoResumenDto,
	EstadoAsistenciaCurso,
	ESTADO_ASISTENCIA_LABELS,
	ESTADO_ASISTENCIA_SEVERITIES,
} from '../../../models';

@Component({
	selector: 'app-student-attendance-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, TableModule, TagModule, SelectModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './student-attendance-tab.component.html',
	styleUrl: './student-attendance-tab.component.scss',
})
export class StudentAttendanceTabComponent implements OnInit {
	// #region Inputs/Outputs
	readonly asistenciaData = input<MiAsistenciaCursoResumenDto | null>(null);
	readonly loading = input<boolean>(false);
	readonly cursoOptions = input<{ label: string; value: number }[]>([]);
	readonly selectedCurso = input<number | null>(null);
	readonly cursoChange = output<number>();
	// #endregion

	// #region Estado local
	selectedCursoLocal: number | null = null;
	// #endregion

	// #region Computed
	readonly stats = computed(() => {
		const data = this.asistenciaData();
		if (!data) return null;
		const porcentaje = data.totalClases > 0
			? Math.round((data.totalPresente / data.totalClases) * 100)
			: 0;
		return {
			totalPresente: data.totalPresente,
			totalTarde: data.totalTarde,
			totalFalto: data.totalFalto,
			totalClases: data.totalClases,
			porcentajeAsistencia: porcentaje,
		};
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const opts = this.cursoOptions();
		if (opts.length > 0 && !this.selectedCurso()) {
			this.selectedCursoLocal = opts[0].value;
			this.cursoChange.emit(opts[0].value);
		}
	}

	constructor() {
		effect(() => {
			const opts = this.cursoOptions();
			if (opts.length > 0 && !this.selectedCursoLocal) {
				this.selectedCursoLocal = opts[0].value;
				this.cursoChange.emit(opts[0].value);
			}
		});
	}
	// #endregion

	// #region Helpers
	getEstadoLabel(estado: string): string {
		return ESTADO_ASISTENCIA_LABELS[estado as EstadoAsistenciaCurso] ?? estado;
	}

	getEstadoSeverity(estado: string): 'success' | 'warn' | 'danger' | 'info' {
		return (ESTADO_ASISTENCIA_SEVERITIES[estado as EstadoAsistenciaCurso] ?? 'info') as 'success' | 'warn' | 'danger' | 'info';
	}

	onCursoChange(value: number): void {
		this.selectedCursoLocal = value;
		this.cursoChange.emit(value);
	}
	// #endregion
}
