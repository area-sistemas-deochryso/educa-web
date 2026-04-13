import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SemanaEstudianteArchivosDto, CalificacionConNotasDto } from '@features/intranet/pages/profesor/models';
import { getNotaSeverity } from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';
import { FormatFileSizePipe } from '@shared/pipes';

@Component({
	selector: 'app-student-files-dialog',
	standalone: true,
	imports: [CommonModule, DialogModule, ButtonModule, TooltipModule, TagModule, ProgressSpinnerModule, FormatFileSizePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './student-files-dialog.component.html',
	styleUrl: './student-files-dialog.component.scss',
})
export class StudentFilesDialogComponent {
	// #region Inputs/Outputs
	readonly visible = input<boolean>(false);
	readonly data = input<SemanaEstudianteArchivosDto[]>([]);
	readonly loading = input<boolean>(false);
	readonly calificaciones = input<CalificacionConNotasDto[]>([]);
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);
	readonly visibleChange = output<boolean>();
	readonly irACalificaciones = output<void>();
	// #endregion

	// #region Handlers
	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	openArchivo(url: string): void {
		window.open(url, '_blank');
	}

	onIrACalificaciones(): void {
		this.irACalificaciones.emit();
	}
	// #endregion

	// #region Helpers
	hasAnyFiles(): boolean {
		return this.data().some((s) => s.estudiantes.some((e) => e.archivos.length > 0));
	}

	getNotasEstudiante(semanaNumero: number, estudianteId: number): { titulo: string; nota: number; severity: 'success' | 'warn' | 'danger' }[] {
		const cals = this.calificaciones();
		const result: { titulo: string; nota: number; severity: 'success' | 'warn' | 'danger' }[] = [];
		for (const cal of cals) {
			if (cal.numeroSemana !== semanaNumero) continue;
			const notaEntry = cal.notas.find((n) => n.estudianteId === estudianteId);
			if (notaEntry) {
				result.push({
					titulo: cal.titulo,
					nota: notaEntry.nota,
					severity: this.getNotaSeverity(notaEntry.nota),
				});
			}
		}
		return result;
	}

	getNotaSeverity(nota: number): 'success' | 'warn' | 'danger' {
		const severity = getNotaSeverity(nota, this.calificacionConfig());
		return severity === 'secondary' ? 'danger' : severity;
	}
	// #endregion
}
