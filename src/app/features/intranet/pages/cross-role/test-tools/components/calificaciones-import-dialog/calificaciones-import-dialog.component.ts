// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { ExcelService } from '@core/services';
import { logger } from '@core/helpers';
import { EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate } from '@edu-ui';

import { type NotaImportRow, findColumnKey, parseId, parseNota } from '../../helpers/calificaciones-import.config';
import { CreacionMasivaResponseDto, CrearNotaDto } from '../../models';

// #endregion

type DialogStep = 'upload' | 'preview' | 'result';

/**
 * Type guard: una fila `valido` tiene los 3 campos requeridos presentes, pero el tipo no lo
 * codifica. `nota` puede ser 0 (valor valido) — chequeo estricto `!== null`, no falsy.
 */
function isCompleteRow(
	f: NotaImportRow,
): f is NotaImportRow & { calificacionId: number; estudianteId: number; nota: number } {
	return f.valido && f.calificacionId !== null && f.estudianteId !== null && f.nota !== null;
}

// #region Component
@Component({
	selector: 'app-calificaciones-import-dialog',
	standalone: true,
	imports: [EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calificaciones-import-dialog.component.html',
	styleUrl: './calificaciones-import-dialog.component.scss',
})
export class CalificacionesImportDialogComponent {
	private readonly excelService = inject(ExcelService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly result = input<CreacionMasivaResponseDto | null>(null);

	readonly visibleChange = output<boolean>();
	readonly importar = output<CrearNotaDto[]>();
	// #endregion

	// #region Estado local
	readonly step = signal<DialogStep>('upload');
	readonly filas = signal<NotaImportRow[]>([]);
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
						'No se encontraron notas. Verifica que las columnas sean: CalificacionId, EstudianteId, Nota, Observacion (opcional).',
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
		const payload: CrearNotaDto[] = validRows.map((f) => ({
			calificacionId: f.calificacionId,
			estudianteId: f.estudianteId,
			nota: f.nota,
			observacion: f.observacion ?? undefined,
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

	private async parseExcel(buffer: ArrayBuffer): Promise<NotaImportRow[]> {
		const sheets = await this.excelService.parseXlsx(buffer);
		const rows: NotaImportRow[] = [];

		if (sheets.length === 0) return rows;

		// Usar la primera hoja
		const sheet = sheets[0];
		if (sheet.data.length === 0) return rows;

		const sampleKeys = Object.keys(sheet.data[0]);
		const calificacionKey = findColumnKey(sampleKeys, 'calificacionId');
		const estudianteKey = findColumnKey(sampleKeys, 'estudianteId');
		const notaKey = findColumnKey(sampleKeys, 'nota');
		const observacionKey = findColumnKey(sampleKeys, 'observacion');

		if (!calificacionKey && !estudianteKey && !notaKey) {
			logger.warn('No se detectaron columnas de calificación en el archivo');
			return rows;
		}

		for (let i = 0; i < sheet.data.length; i++) {
			const raw = sheet.data[i];
			const fila = i + 2; // +2 porque fila 1 es el header

			const calificacionId = calificacionKey ? parseId(raw[calificacionKey]) : null;
			const estudianteId = estudianteKey ? parseId(raw[estudianteKey]) : null;
			const nota = notaKey ? parseNota(raw[notaKey]) : null;
			const observacion = observacionKey ? String(raw[observacionKey] ?? '').trim() || null : null;

			// Validar fila — chequeo estricto (nota puede ser 0, valor valido)
			const errors: string[] = [];
			if (calificacionId === null) errors.push('Calificacion ID');
			if (estudianteId === null) errors.push('Estudiante ID');
			if (nota === null) errors.push('Nota (0-20)');

			const valido = errors.length === 0;

			rows.push({
				fila,
				calificacionId,
				estudianteId,
				nota,
				observacion,
				valido,
				error: valido ? null : errors.join(', '),
			});
		}

		return rows;
	}
	// #endregion
}
// #endregion
