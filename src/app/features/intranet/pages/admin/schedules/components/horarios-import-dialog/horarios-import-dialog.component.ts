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
	template: `
		<!-- #region Dialog -->
		<p-dialog
			[visible]="visible()"
			(visibleChange)="onDialogHide()"
			[modal]="true"
			[draggable]="false"
			[resizable]="false"
			[style]="{ width: '700px', maxWidth: '95vw' }"
			styleClass="import-dialog"
		>
			<ng-template pTemplate="header">
				<span class="dialog-title">
					<i class="pi pi-upload"></i>
					Importar Horarios
				</span>
			</ng-template>

			<!-- #region Paso 1: Upload -->
			@if (step() === 'upload') {
				<div class="step-upload">
					<p class="step-description">
						Sube un archivo Excel (.xlsx) o CSV con los horarios a importar.
					</p>

					<div class="upload-area">
						<input
							#fileInput
							type="file"
							accept=".xlsx,.csv"
							class="file-input-hidden"
							(change)="onSelectFile($event)"
						/>
						<button
							pButton
							type="button"
							icon="pi pi-file-excel"
							label="Seleccionar archivo"
							class="p-button-outlined"
							(click)="fileInput.click()"
						></button>
						@if (fileName()) {
							<span class="file-name">
								<i class="pi pi-check-circle text-green-500"></i>
								{{ fileName() }}
							</span>
						}
					</div>

					@if (parseError()) {
						<div class="parse-error">
							<i class="pi pi-exclamation-triangle"></i>
							{{ parseError() }}
						</div>
					}

					<div class="column-hint">
						<p class="hint-title">Columnas esperadas:</p>
						<div class="hint-grid">
							<span><strong>Dia</strong> - Nombre ("Lunes") o numero (1-7)</span>
							<span><strong>HoraInicio</strong> - Formato HH:mm (ej: 08:00)</span>
							<span><strong>HoraFin</strong> - Formato HH:mm (ej: 09:30)</span>
							<span><strong>SalonId</strong> - ID del salon</span>
							<span><strong>CursoId</strong> - ID del curso</span>
						</div>
					</div>
				</div>
			}
			<!-- #endregion -->

			<!-- #region Paso 2: Preview -->
			@if (step() === 'preview') {
				<div class="step-preview">
					<div class="preview-summary">
						<span class="summary-count">
							<strong>{{ totalFilas() }}</strong> horarios encontrados
							@if (invalidCount() > 0) {
								&mdash;
								<p-tag [value]="invalidCount() + ' con errores'" severity="danger" />
							}
						</span>
						<button
							pButton
							type="button"
							icon="pi pi-arrow-left"
							label="Cambiar archivo"
							class="p-button-text p-button-sm"
							(click)="onNuevoArchivo()"
							[pt]="{ root: { 'aria-label': 'Cambiar archivo' } }"
						></button>
					</div>

					<p-table
						[value]="filas()"
						[scrollable]="true"
						scrollHeight="340px"
						styleClass="p-datatable-sm"
					>
						<ng-template pTemplate="header">
							<tr>
								<th style="width: 60px">Fila</th>
								<th style="width: 100px">Dia</th>
								<th style="width: 90px">Inicio</th>
								<th style="width: 90px">Fin</th>
								<th style="width: 90px">Salon ID</th>
								<th style="width: 90px">Curso ID</th>
								<th>Estado</th>
							</tr>
						</ng-template>
						<ng-template pTemplate="body" let-fila>
							<tr [class.row-invalid]="!fila.valido">
								<td>{{ fila.fila }}</td>
								<td>{{ fila.diaLabel }}</td>
								<td>{{ fila.horaInicio || '—' }}</td>
								<td>{{ fila.horaFin || '—' }}</td>
								<td>{{ fila.salonId ?? '—' }}</td>
								<td>{{ fila.cursoId ?? '—' }}</td>
								<td>
									@if (fila.valido) {
										<p-tag value="OK" severity="success" />
									} @else {
										<p-tag [value]="fila.error!" severity="danger" />
									}
								</td>
							</tr>
						</ng-template>
					</p-table>
				</div>
			}
			<!-- #endregion -->

			<!-- #region Paso 3: Result -->
			@if (step() === 'result') {
				<div class="step-result">
					@if (loading()) {
						<div class="loading-state">
							<p-progressspinner
								strokeWidth="4"
								animationDuration=".8s"
								[style]="{ width: '48px', height: '48px' }"
							/>
							<p>Importando horarios...</p>
						</div>
					} @else if (result()) {
						<div class="result-summary">
							<div class="result-stat">
								<i class="pi pi-plus-circle text-green-500"></i>
								<span class="result-number">{{ result()!.creados }}</span>
								<span class="result-label">creados</span>
							</div>
							<div class="result-stat">
								<i class="pi pi-exclamation-triangle text-orange-500"></i>
								<span class="result-number">{{ result()!.rechazados }}</span>
								<span class="result-label">rechazados</span>
							</div>
						</div>

						@if (result()!.errores.length > 0) {
							<p-table
								[value]="result()!.errores"
								styleClass="p-datatable-sm error-table"
								[scrollable]="true"
								scrollHeight="220px"
							>
								<ng-template pTemplate="caption">
									<span class="error-table-title">
										<i class="pi pi-exclamation-circle"></i> Errores de importacion
									</span>
								</ng-template>
								<ng-template pTemplate="header">
									<tr>
										<th style="width: 60px">Fila</th>
										<th style="width: 90px">Dia</th>
										<th style="width: 90px">Inicio</th>
										<th style="width: 90px">Fin</th>
										<th>Razon</th>
									</tr>
								</ng-template>
								<ng-template pTemplate="body" let-err>
									<tr>
										<td>{{ err.fila }}</td>
										<td>{{ err.dia }}</td>
										<td>{{ err.horaInicio }}</td>
										<td>{{ err.horaFin }}</td>
										<td class="error-reason">{{ err.razon }}</td>
									</tr>
								</ng-template>
							</p-table>
						}
					}
				</div>
			}
			<!-- #endregion -->

			<ng-template pTemplate="footer">
				@if (step() === 'upload') {
					<button
						pButton
						type="button"
						label="Cancelar"
						class="p-button-text"
						(click)="onClose()"
					></button>
				}
				@if (step() === 'preview') {
					<button
						pButton
						type="button"
						label="Cancelar"
						class="p-button-text"
						(click)="onClose()"
					></button>
					<button
						pButton
						type="button"
						icon="pi pi-upload"
						[label]="'Importar ' + validCount() + ' horarios'"
						[disabled]="!canImport()"
						(click)="onImportar()"
					></button>
				}
				@if (step() === 'result') {
					@if (!loading()) {
						<button
							pButton
							type="button"
							icon="pi pi-refresh"
							label="Importar otro archivo"
							class="p-button-outlined"
							(click)="onNuevoArchivo()"
						></button>
						<button
							pButton
							type="button"
							label="Cerrar"
							(click)="onClose()"
						></button>
					}
				}
			</ng-template>
		</p-dialog>
		<!-- #endregion -->
	`,
	styles: `
		// #region Dialog layout
		.dialog-title {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-weight: 600;
			font-size: 1.05rem;
		}
		// #endregion

		// #region Step: upload
		.step-upload {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
			padding: 0.25rem 0;
		}

		.step-description {
			color: var(--text-color-secondary);
			margin: 0;
		}

		.upload-area {
			display: flex;
			align-items: center;
			gap: 1rem;
			flex-wrap: wrap;
		}

		.file-input-hidden {
			display: none;
		}

		.file-name {
			display: flex;
			align-items: center;
			gap: 0.4rem;
			color: var(--text-color-secondary);
			font-size: 0.9rem;
		}

		.parse-error {
			display: flex;
			align-items: flex-start;
			gap: 0.5rem;
			padding: 0.75rem 1rem;
			background: rgba(220, 38, 38, 0.08);
			border: 1px solid rgba(220, 38, 38, 0.3);
			border-radius: 6px;
			color: #dc2626;
			font-size: 0.9rem;
		}

		.column-hint {
			padding: 0.75rem 1rem;
			background: var(--surface-100);
			border-radius: 6px;
		}

		.hint-title {
			font-size: 0.85rem;
			font-weight: 600;
			margin: 0 0 0.4rem;
			color: var(--text-color-secondary);
		}

		.hint-grid {
			display: flex;
			flex-direction: column;
			gap: 0.2rem;
			font-size: 0.82rem;
			color: var(--text-color-secondary);
		}
		// #endregion

		// #region Step: preview
		.step-preview {
			display: flex;
			flex-direction: column;
			gap: 1rem;
			max-height: 60vh;
			overflow-y: auto;
		}

		.preview-summary {
			display: flex;
			align-items: center;
			justify-content: space-between;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.summary-count {
			display: flex;
			align-items: center;
			gap: 0.4rem;
			font-size: 0.95rem;
		}

		.row-invalid {
			background: rgba(220, 38, 38, 0.04) !important;
		}
		// #endregion

		// #region Step: result
		.step-result {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
			min-height: 120px;
		}

		.loading-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1rem;
			padding: 2rem 0;
			color: var(--text-color-secondary);
		}

		.result-summary {
			display: flex;
			gap: 2rem;
			justify-content: center;
			padding: 1rem 0;
		}

		.result-stat {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.25rem;
		}

		.result-number {
			font-size: 2rem;
			font-weight: 700;
			line-height: 1;
		}

		.result-label {
			font-size: 0.85rem;
			color: var(--text-color-secondary);
		}

		.error-table-title {
			font-size: 0.9rem;
			font-weight: 600;
			color: #dc2626;
			display: flex;
			align-items: center;
			gap: 0.4rem;
		}

		.error-reason {
			color: #dc2626;
			font-size: 0.85rem;
		}
		// #endregion
	`,
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
