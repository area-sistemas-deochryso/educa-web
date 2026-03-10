import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import {
	AsistenciaCursoEstudianteDto,
	EstadoAsistenciaCurso,
	ESTADO_ASISTENCIA_LABELS,
	ESTADO_ASISTENCIA_SEVERITIES,
	ESTADO_ASISTENCIA_ICONS,
} from '../../../models';

@Component({
	selector: 'app-asistencia-registro-panel',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		DatePickerModule,
		TagModule,
		InputTextModule,
		TooltipModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './asistencia-registro-panel.component.html',
	styleUrl: './asistencia-registro-panel.component.scss',
})
export class AsistenciaRegistroPanelComponent {
	// #region Inputs
	readonly estudiantes = input<AsistenciaCursoEstudianteDto[]>([]);
	readonly loading = input(false);
	readonly saving = input(false);
	readonly stats = input<{ total: number; presentes: number; tardes: number; faltas: number }>({
		total: 0,
		presentes: 0,
		tardes: 0,
		faltas: 0,
	});
	// #endregion

	// #region Outputs
	readonly fechaChange = output<string>();
	readonly estadoChange = output<{ estudianteId: number; estado: EstadoAsistenciaCurso }>();
	readonly justificacionChange = output<{ estudianteId: number; justificacion: string | null }>();
	readonly save = output<void>();
	// #endregion

	// #region Estado local
	selectedDate: Date = new Date();
	// #endregion

	// #region Computed
	readonly hasEstudiantes = computed(() => this.estudiantes().length > 0);
	// #endregion

	// #region Constants
	readonly labels = ESTADO_ASISTENCIA_LABELS;
	readonly severities = ESTADO_ASISTENCIA_SEVERITIES;
	readonly icons = ESTADO_ASISTENCIA_ICONS;
	readonly estados: EstadoAsistenciaCurso[] = ['P', 'T', 'F'];
	// #endregion

	// #region Handlers
	onDateSelect(): void {
		const fecha = this.formatDate(this.selectedDate);
		this.fechaChange.emit(fecha);
	}

	onEstadoChange(estudianteId: number, estado: EstadoAsistenciaCurso): void {
		this.estadoChange.emit({ estudianteId, estado });
	}

	onJustificacionChange(estudianteId: number, value: string): void {
		this.justificacionChange.emit({ estudianteId, justificacion: value || null });
	}

	onSave(): void {
		this.save.emit();
	}
	// #endregion

	// #region Helpers
	getEstadoSeverity(estado: EstadoAsistenciaCurso): 'success' | 'warn' | 'danger' {
		const map: Record<EstadoAsistenciaCurso, 'success' | 'warn' | 'danger'> = {
			P: 'success',
			T: 'warn',
			F: 'danger',
		};
		return map[estado];
	}

	private formatDate(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	// #endregion
}
