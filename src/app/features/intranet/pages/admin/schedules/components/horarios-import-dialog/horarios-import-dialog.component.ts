// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ExcelService } from '@core/services';
import { logger } from '@core/helpers';
import {
	type HorarioImportRow,
	type ImportarHorarioItem,
	type ImportarHorariosResult,
	findColumnKey,
	getDiaLabel,
	parseDiaSemana,
	parseHora,
	parseId,
} from '../../helpers/horario-import.config';

// #endregion

type DialogStep = 'upload' | 'preview' | 'result';

// #region Component
@Component({
	selector: 'app-schedules-import-dialog',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		DialogModule,
		ProgressSpinnerModule,
		TableModule,
		TagModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './horarios-import-dialog.component.html',
	styleUrl: './horarios-import-dialog.component.scss',
})
export class SchedulesImportDialogComponent {
	private readonly excelService = inject(ExcelService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly result = input<ImportarHorariosResult | null>(null);

	readonly visibleChange = output<boolean>();
	readonly importar = output<ImportarHorarioItem[]>();
	// #endregion

	// #region Estado local
	readonly step = signal<DialogStep>('upload');
	readonly filas = signal<HorarioImportRow[]>([]);
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
						'No se encontraron horarios. Verifica que las columnas sean: Dia, HoraInicio, HoraFin, SalonId, CursoId.',
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
		const payload: ImportarHorarioItem[] = validRows.map((f) => ({
			diaSemana: f.diaSemana!,
			horaInicio: f.horaInicio,
			horaFin: f.horaFin,
			salonId: f.salonId!,
			cursoId: f.cursoId!,
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

	private async parseExcel(buffer: ArrayBuffer): Promise<HorarioImportRow[]> {
		const sheets = await this.excelService.parseXlsx(buffer);
		const rows: HorarioImportRow[] = [];

		if (sheets.length === 0) return rows;

		// Usar la primera hoja
		const sheet = sheets[0];
		if (sheet.data.length === 0) return rows;

		const sampleKeys = Object.keys(sheet.data[0]);
		const diaKey = findColumnKey(sampleKeys, 'diaSemana');
		const inicioKey = findColumnKey(sampleKeys, 'horaInicio');
		const finKey = findColumnKey(sampleKeys, 'horaFin');
		const salonKey = findColumnKey(sampleKeys, 'salonId');
		const cursoKey = findColumnKey(sampleKeys, 'cursoId');

		if (!diaKey && !inicioKey && !finKey) {
			logger.warn('No se detectaron columnas de horario en el archivo');
			return rows;
		}

		for (let i = 0; i < sheet.data.length; i++) {
			const raw = sheet.data[i];
			const fila = i + 2; // +2 porque fila 1 es el header

			const diaSemana = diaKey ? parseDiaSemana(raw[diaKey]) : null;
			const horaInicio = inicioKey ? parseHora(raw[inicioKey]) : '';
			const horaFin = finKey ? parseHora(raw[finKey]) : '';
			const salonId = salonKey ? parseId(raw[salonKey]) : null;
			const cursoId = cursoKey ? parseId(raw[cursoKey]) : null;

			// Validar fila
			const errors: string[] = [];
			if (!diaSemana) errors.push('Dia invalido');
			if (!horaInicio) errors.push('Hora inicio');
			if (!horaFin) errors.push('Hora fin');
			if (!salonId) errors.push('Salon ID');
			if (!cursoId) errors.push('Curso ID');
			if (horaInicio && horaFin && horaInicio >= horaFin) errors.push('Inicio >= Fin');

			const valido = errors.length === 0;

			rows.push({
				fila,
				diaSemana,
				diaLabel: getDiaLabel(diaSemana),
				horaInicio,
				horaFin,
				salonId,
				cursoId,
				valido,
				error: valido ? null : errors.join(', '),
			});
		}

		return rows;
	}
	// #endregion
}
// #endregion
