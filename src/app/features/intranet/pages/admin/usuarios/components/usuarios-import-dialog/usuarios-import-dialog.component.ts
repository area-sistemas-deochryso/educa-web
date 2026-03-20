// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ImportarEstudianteItem, ImportarEstudiantesResponse } from '../../services';
import {
	EstudianteImportRow,
	SHEET_TO_GRADO,
	SECCIONES_IMPORT,
	parseDni,
	splitNombreCompleto,
} from '../../helpers/estudiante-import.config';
import * as XLSX from 'xlsx';

// #endregion
// #region Component

type DialogStep = 'config' | 'preview' | 'result';

interface GradoGroup {
	grado: string;
	filas: EstudianteImportRow[];
}

@Component({
	selector: 'app-usuarios-import-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		AccordionModule,
		ButtonModule,
		DialogModule,
		ProgressSpinnerModule,
		SelectModule,
		TableModule,
		TagModule,
	],
	templateUrl: './usuarios-import-dialog.component.html',
	styleUrl: './usuarios-import-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosImportDialogComponent {
	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly result = input<ImportarEstudiantesResponse | null>(null);

	readonly visibleChange = output<boolean>();
	readonly importar = output<ImportarEstudianteItem[]>();
	// #endregion

	// #region Estado local
	readonly step = signal<DialogStep>('config');
	readonly seccion = signal<string>('A');
	readonly filas = signal<EstudianteImportRow[]>([]);
	readonly parseError = signal<string | null>(null);
	readonly fileName = signal<string | null>(null);

	readonly seccionesOptions = SECCIONES_IMPORT;
	// #endregion

	// #region Computed
	readonly gradoGroups = computed<GradoGroup[]>(() => {
		const map = new Map<string, EstudianteImportRow[]>();
		for (const fila of this.filas()) {
			const arr = map.get(fila.grado) ?? [];
			arr.push(fila);
			map.set(fila.grado, arr);
		}
		return Array.from(map.entries()).map(([grado, filas]) => ({ grado, filas }));
	});

	readonly totalFilas = computed(() => this.filas().length);

	readonly canImport = computed(() => this.totalFilas() > 0 && !this.loading());

	readonly resultHasErrors = computed(() => (this.result()?.errores?.length ?? 0) > 0);
	// #endregion

	// #region Handlers — step navigation

	onSelectFile(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		this.fileName.set(file.name);
		this.parseError.set(null);

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const buffer = e.target?.result as ArrayBuffer;
				const parsed = this.parseExcel(buffer, this.seccion());
				if (parsed.length === 0) {
					this.parseError.set(
						'No se encontraron estudiantes válidos. Verifica que los nombres de las hojas coincidan con los grados esperados.',
					);
					this.filas.set([]);
				} else {
					this.filas.set(parsed);
					this.step.set('preview');
				}
			} catch {
				this.parseError.set('Error al leer el archivo Excel. Asegúrate de que es un archivo .xlsx válido.');
				this.filas.set([]);
			}
			// Reset input para permitir seleccionar el mismo archivo de nuevo
			input.value = '';
		};
		reader.readAsArrayBuffer(file);
	}

	onImportar(): void {
		const payload: ImportarEstudianteItem[] = this.filas().map((f) => ({
			apellidos: f.apellidos,
			nombres: f.nombres,
			dni: f.dni,
			grado: f.grado,
			seccion: f.seccion,
			nombreApoderado: f.nombreApoderado,
			correoApoderado: f.correoApoderado,
		}));
		this.step.set('result');
		this.importar.emit(payload);
	}

	onNuevoArchivo(): void {
		this.step.set('config');
		this.filas.set([]);
		this.fileName.set(null);
		this.parseError.set(null);
	}

	onClose(): void {
		this.visibleChange.emit(false);
	}

	onDialogHide(): void {
		this.visibleChange.emit(false);
		// Reset al cerrar para que el próximo open empiece limpio
		setTimeout(() => {
			this.step.set('config');
			this.filas.set([]);
			this.fileName.set(null);
			this.parseError.set(null);
		}, 300);
	}
	// #endregion

	// #region Excel parsing

	private parseExcel(buffer: ArrayBuffer, seccion: string): EstudianteImportRow[] {
		const wb = XLSX.read(buffer, { type: 'array' });
		const rows: EstudianteImportRow[] = [];

		for (const sheetName of wb.SheetNames) {
			const grado = SHEET_TO_GRADO[sheetName.trim()];
			if (!grado) continue;

			const ws = wb.Sheets[sheetName];
			const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

			for (const raw of data) {
				const keys = Object.keys(raw);

				// Detectar columna nombre (busca APELLIDOS o NOMBRES en el header)
				const nombreKey = keys.find(
					(k) => k.toUpperCase().includes('APELLIDOS') || k.toUpperCase().includes('NOMBRES'),
				);
				if (!nombreKey) continue;

				const nombreCompleto = String(raw[nombreKey] ?? '').trim();
				if (!nombreCompleto) continue;

				// Detectar DNI
				const dniKey = keys.find((k) => k.toUpperCase().includes('DNI'));
				const dni = dniKey ? parseDni(raw[dniKey]) : undefined;

				// Detectar apoderado y correo
				const padreKey = keys.find(
					(k) => k.toUpperCase().includes('PADRE') || k.toUpperCase().includes('PADRES'),
				);
				const correoKey = keys.find((k) => k.toUpperCase().includes('CORREO'));

				const { apellidos, nombres } = splitNombreCompleto(nombreCompleto);
				if (!apellidos || !nombres) continue;

				rows.push({
					nombreCompleto,
					apellidos,
					nombres,
					dni,
					grado,
					seccion,
					nombreApoderado: padreKey
						? String(raw[padreKey] ?? '').trim() || undefined
						: undefined,
					correoApoderado:
						padreKey && correoKey
							? String(raw[correoKey] ?? '').trim() || undefined
							: undefined,
				});
			}
		}

		return rows;
	}
	// #endregion
}
// #endregion
