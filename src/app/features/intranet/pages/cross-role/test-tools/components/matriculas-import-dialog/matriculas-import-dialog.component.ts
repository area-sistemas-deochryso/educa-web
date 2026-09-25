// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { ExcelService } from '@core/services';
import { logger } from '@core/helpers';
import { EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate } from '@edu-ui';

import { type MatriculaImportRow, findColumnKey, parseId } from '../../helpers/matriculas-import.config';
import { CreacionMasivaResponseDto, CrearMatriculaDto } from '../../models';

// #endregion

type DialogStep = 'upload' | 'preview' | 'result';

/** Type guard: una fila `valido` tiene los 2 IDs presentes, pero el tipo no lo codifica. */
function isCompleteRow(
	f: MatriculaImportRow,
): f is MatriculaImportRow & { estudianteId: number; salonId: number } {
	return f.valido && f.estudianteId !== null && f.salonId !== null;
}

// #region Component
@Component({
	selector: 'app-matriculas-import-dialog',
	standalone: true,
	imports: [EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './matriculas-import-dialog.component.html',
	styleUrl: './matriculas-import-dialog.component.scss',
})
export class MatriculasImportDialogComponent {
	private readonly excelService = inject(ExcelService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly result = input<CreacionMasivaResponseDto | null>(null);

	readonly visibleChange = output<boolean>();
	readonly importar = output<CrearMatriculaDto[]>();
	// #endregion

	// #region Estado local
	readonly step = signal<DialogStep>('upload');
	readonly filas = signal<MatriculaImportRow[]>([]);
	readonly parseError = signal<string | null>(null);
	readonly fileName = signal<string | null>(null);
	// #endregion

	// #region Computed
	readonly totalFilas = computed(() => this.filas().length);
	readonly validCount = computed(() => this.filas().filter((f) => f.valido).length);
	readonly invalidCount = computed(() => this.filas().filter((f) => !f.valido).length);
	readonly canImport = computed(() => this.validCount() > 0 && !this.loading());
	// #endregion

	// #region Handlers - step navigation

	onSelectFile(event: Event): void {
		const fileInput = event.target as HTMLInputElement;
		const file = fileInput.files?.[0];
		if (!file) return;

		this.fileName.set(file.name);
		this.parseError.set(null);

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const buffer = e.target?.result as ArrayBuffer;
				const parsed = await this.parseExcel(buffer);
				if (parsed.length === 0) {
					this.parseError.set(
						'No se encontraron matrículas. Verifica que las columnas sean: EstudianteId, SalonId.',
					);
					this.filas.set([]);
				} else {
					this.filas.set(parsed);
					this.step.set('preview');
				}
			} catch {
				this.parseError.set('Error al leer el archivo. Asegurate de que es un archivo .xlsx o .csv valido.');
				this.filas.set([]);
			}
			// Reset input para permitir seleccionar el mismo archivo de nuevo
			fileInput.value = '';
		};
		reader.readAsArrayBuffer(file);
	}

	onImportar(): void {
		const validRows = this.filas().filter(isCompleteRow);
		const payload: CrearMatriculaDto[] = validRows.map((f) => ({
			estudianteId: f.estudianteId,
			salonId: f.salonId,
		}));
		this.step.set('result');
		this.importar.emit(payload);
	}

	onNuevoArchivo(): void {
		this.step.set('upload');
		this.filas.set([]);
		this.fileName.set(null);
		this.parseError.set(null);
	}

	onClose(): void {
		this.visibleChange.emit(false);
	}

	onDialogHide(): void {
		this.visibleChange.emit(false);
		// Reset al cerrar para que el proximo open empiece limpio
		setTimeout(() => {
			this.step.set('upload');
			this.filas.set([]);
			this.fileName.set(null);
			this.parseError.set(null);
		}, 300);
	}
	// #endregion

	// #region Excel parsing

	private async parseExcel(buffer: ArrayBuffer): Promise<MatriculaImportRow[]> {
		const sheets = await this.excelService.parseXlsx(buffer);
		const rows: MatriculaImportRow[] = [];

		if (sheets.length === 0) return rows;

		// Usar la primera hoja
		const sheet = sheets[0];
		if (sheet.data.length === 0) return rows;

		const sampleKeys = Object.keys(sheet.data[0]);
		const estudianteKey = findColumnKey(sampleKeys, 'estudianteId');
		const salonKey = findColumnKey(sampleKeys, 'salonId');

		if (!estudianteKey && !salonKey) {
			logger.warn('No se detectaron columnas de matrícula en el archivo');
			return rows;
		}

		for (let i = 0; i < sheet.data.length; i++) {
			const raw = sheet.data[i];
			const fila = i + 2; // +2 porque fila 1 es el header

			const estudianteId = estudianteKey ? parseId(raw[estudianteKey]) : null;
			const salonId = salonKey ? parseId(raw[salonKey]) : null;

			// Validar fila
			const errors: string[] = [];
			if (!estudianteId) errors.push('Estudiante ID');
			if (!salonId) errors.push('Salon ID');

			const valido = errors.length === 0;

			rows.push({
				fila,
				estudianteId,
				salonId,
				valido,
				error: valido ? null : errors.join(', '),
			});
		}

		return rows;
	}
	// #endregion
}
// #endregion
