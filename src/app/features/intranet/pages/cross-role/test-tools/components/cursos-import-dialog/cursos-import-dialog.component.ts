// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExcelService } from '@core/services';
import { logger } from '@core/helpers';
import { EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate } from '@edu-ui';

import {
	CURSO_NOMBRE_MAX_LENGTH,
	type CursoImportRow,
	findColumnKey,
	parseGradosIds,
} from '../../helpers/cursos-import.config';
import { CreacionMasivaResponseDto, CrearCursoDto } from '../../models';

// #endregion

type DialogStep = 'upload' | 'preview' | 'result';

// #region Component
@Component({
	selector: 'app-cursos-import-dialog',
	standalone: true,
	imports: [CommonModule, EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './cursos-import-dialog.component.html',
	styleUrl: './cursos-import-dialog.component.scss',
})
export class CursosImportDialogComponent {
	private readonly excelService = inject(ExcelService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly result = input<CreacionMasivaResponseDto | null>(null);

	readonly visibleChange = output<boolean>();
	readonly importar = output<CrearCursoDto[]>();
	// #endregion

	// #region Estado local
	readonly step = signal<DialogStep>('upload');
	readonly filas = signal<CursoImportRow[]>([]);
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
						'No se encontraron cursos. Verifica que las columnas sean: Nombre, GradosIds.',
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
		const validRows = this.filas().filter((f) => f.valido);
		const payload: CrearCursoDto[] = validRows.map((f) => ({
			nombre: f.nombre,
			gradosIds: f.gradosIds,
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

	private async parseExcel(buffer: ArrayBuffer): Promise<CursoImportRow[]> {
		const sheets = await this.excelService.parseXlsx(buffer);
		const rows: CursoImportRow[] = [];

		if (sheets.length === 0) return rows;

		// Usar la primera hoja
		const sheet = sheets[0];
		if (sheet.data.length === 0) return rows;

		const sampleKeys = Object.keys(sheet.data[0]);
		const nombreKey = findColumnKey(sampleKeys, 'nombre');
		const gradosKey = findColumnKey(sampleKeys, 'gradosIds');

		if (!nombreKey && !gradosKey) {
			logger.warn('No se detectaron columnas de curso en el archivo');
			return rows;
		}

		for (let i = 0; i < sheet.data.length; i++) {
			const raw = sheet.data[i];
			const fila = i + 2; // +2 porque fila 1 es el header

			const nombre = nombreKey ? String(raw[nombreKey] ?? '').trim() : '';
			const gradosIds = gradosKey ? parseGradosIds(raw[gradosKey]) : [];

			// Validar fila
			const errors: string[] = [];
			if (!nombre) errors.push('Nombre requerido');
			if (nombre.length > CURSO_NOMBRE_MAX_LENGTH) errors.push(`Nombre supera ${CURSO_NOMBRE_MAX_LENGTH} caracteres`);
			if (gradosIds.length === 0) errors.push('Grados IDs requerido');

			const valido = errors.length === 0;

			rows.push({
				fila,
				nombre,
				gradosIds,
				valido,
				error: valido ? null : errors.join(', '),
			});
		}

		return rows;
	}
	// #endregion
}
// #endregion
