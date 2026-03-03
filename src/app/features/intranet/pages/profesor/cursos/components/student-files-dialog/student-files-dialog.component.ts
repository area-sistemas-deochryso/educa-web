import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SemanaEstudianteArchivosDto } from '../../../models';

@Component({
	selector: 'app-student-files-dialog',
	standalone: true,
	imports: [CommonModule, DialogModule, ProgressSpinnerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './student-files-dialog.component.html',
	styleUrl: './student-files-dialog.component.scss',
})
export class StudentFilesDialogComponent {
	readonly visible = input<boolean>(false);
	readonly data = input<SemanaEstudianteArchivosDto[]>([]);
	readonly loading = input<boolean>(false);
	readonly visibleChange = output<boolean>();

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	openArchivo(url: string): void {
		window.open(url, '_blank');
	}

	formatFileSize(bytes: number | null): string {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1048576).toFixed(1)} MB`;
	}

	hasAnyFiles(): boolean {
		return this.data().some((s) =>
			s.estudiantes.some((e) => e.archivos.length > 0),
		);
	}
}
