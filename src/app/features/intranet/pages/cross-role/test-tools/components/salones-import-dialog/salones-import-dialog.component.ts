// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExcelService } from '@core/services';
import { logger } from '@core/helpers';
import { EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate } from '@edu-ui';

import { type SalonImportRow, findColumnKey, parseId } from '../../helpers/salones-import.config';
import { CreacionMasivaResponseDto, CrearSalonDto } from '../../models';

// #endregion

type DialogStep = 'upload' | 'preview' | 'result';

// #region Component
@Component({
	selector: 'app-salones-import-dialog',
	standalone: true,
	imports: [CommonModule, EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salones-import-dialog.component.html',
	styleUrl: './salones-import-dialog.component.scss',
})
export class SalonesImportDialogComponent {
	private readonly excelService = inject(ExcelService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly result = input<CreacionMasivaResponseDto | null>(null);

	readonly visibleChange = output<boolean>();
	readonly importar = output<CrearSalonDto[]>();
	// #endregion

	// #region Estado local
	readonly step = signal<DialogStep>('upload');
	readonly filas = signal<SalonImportRow[]>([]);
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
						'No se encontraron salones. Verifica que las columnas sean: GradoId, SeccionId, SedeId, Anio.',
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
		const payload: CrearSalonDto[] = validRows.map((f) => ({
			gradoId: f.gradoId!,
			seccionId: f.seccionId!,
			sedeId: f.sedeId!,
			anio: f.anio!,
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

	private async parseExcel(buffer: ArrayBuffer): Promise<SalonImportRow[]> {
		const sheets = await this.excelService.parseXlsx(buffer);
		const rows: SalonImportRow[] = [];

		if (sheets.length === 0) return rows;

		// Usar la primera hoja
		const sheet = sheets[0];
		if (sheet.data.length === 0) return rows;

		const sampleKeys = Object.keys(sheet.data[0]);
		const gradoKey = findColumnKey(sampleKeys, 'gradoId');
		const seccionKey = findColumnKey(sampleKeys, 'seccionId');
		const sedeKey = findColumnKey(sampleKeys, 'sedeId');
		const anioKey = findColumnKey(sampleKeys, 'anio');

		if (!gradoKey && !seccionKey && !sedeKey && !anioKey) {
			logger.warn('No se detectaron columnas de salon en el archivo');
			return rows;
		}

		for (let i = 0; i < sheet.data.length; i++) {
			const raw = sheet.data[i];
			const fila = i + 2; // +2 porque fila 1 es el header

			const gradoId = gradoKey ? parseId(raw[gradoKey]) : null;
			const seccionId = seccionKey ? parseId(raw[seccionKey]) : null;
			const sedeId = sedeKey ? parseId(raw[sedeKey]) : null;
			const anio = anioKey ? parseId(raw[anioKey]) : null;

			// Validar fila
			const errors: string[] = [];
			if (!gradoId) errors.push('Grado ID');
			if (!seccionId) errors.push('Seccion ID');
			if (!sedeId) errors.push('Sede ID');
			if (!anio) errors.push('Anio');

			const valido = errors.length === 0;

			rows.push({
				fila,
				gradoId,
				seccionId,
				sedeId,
				anio,
				valido,
				error: valido ? null : errors.join(', '),
			});
		}

		return rows;
	}
	// #endregion
}
// #endregion
