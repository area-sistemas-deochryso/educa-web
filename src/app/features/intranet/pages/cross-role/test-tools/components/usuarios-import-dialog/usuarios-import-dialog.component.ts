// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExcelService } from '@core/services';
import { RolService } from '@core/services/roles';
import { logger } from '@core/helpers';
import { EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate } from '@edu-ui';

import { DNI_REGEX, type UsuarioImportRow, findColumnKey, parseId } from '../../helpers/usuarios-import.config';
import { CreacionMasivaResponseDto, CrearUsuarioDto } from '../../models';

// #endregion

type DialogStep = 'upload' | 'preview' | 'result';

// #region Component
@Component({
	selector: 'app-usuarios-import-dialog',
	standalone: true,
	imports: [CommonModule, EduButton, EduDialog, EduSpinner, EduTable, EduTag, EduTemplate],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './usuarios-import-dialog.component.html',
	styleUrl: './usuarios-import-dialog.component.scss',
})
export class UsuariosImportDialogComponent {
	private readonly excelService = inject(ExcelService);
	private readonly rolService = inject(RolService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly loading = input<boolean>(false);
	readonly result = input<CreacionMasivaResponseDto | null>(null);

	readonly visibleChange = output<boolean>();
	readonly importar = output<CrearUsuarioDto[]>();
	// #endregion

	// #region Estado local
	readonly step = signal<DialogStep>('upload');
	readonly filas = signal<UsuarioImportRow[]>([]);
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
						'No se encontraron usuarios. Verifica que las columnas sean: Dni, Nombres, Apellidos, Contrasena, Rol.',
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
		const payload: CrearUsuarioDto[] = validRows.map((f) => ({
			dni: f.dni,
			nombres: f.nombres,
			apellidos: f.apellidos,
			contrasena: f.contrasena,
			rol: f.rol,
			sedeId: f.sedeId ?? undefined,
			telefono: f.telefono ?? undefined,
			correo: f.correo ?? undefined,
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

	private async parseExcel(buffer: ArrayBuffer): Promise<UsuarioImportRow[]> {
		const sheets = await this.excelService.parseXlsx(buffer);
		const rows: UsuarioImportRow[] = [];

		if (sheets.length === 0) return rows;

		// Usar la primera hoja
		const sheet = sheets[0];
		if (sheet.data.length === 0) return rows;

		const sampleKeys = Object.keys(sheet.data[0]);
		const dniKey = findColumnKey(sampleKeys, 'dni');
		const nombresKey = findColumnKey(sampleKeys, 'nombres');
		const apellidosKey = findColumnKey(sampleKeys, 'apellidos');
		const contrasenaKey = findColumnKey(sampleKeys, 'contrasena');
		const rolKey = findColumnKey(sampleKeys, 'rol');
		const sedeKey = findColumnKey(sampleKeys, 'sedeId');
		const telefonoKey = findColumnKey(sampleKeys, 'telefono');
		const correoKey = findColumnKey(sampleKeys, 'correo');

		if (!dniKey && !nombresKey && !apellidosKey && !rolKey) {
			logger.warn('No se detectaron columnas de usuario en el archivo');
			return rows;
		}

		// Estudiante tiene su propio import (P107 F3c fuera de alcance) — se excluye del set válido
		const rolesValidos = new Set(
			this.rolService
				.all()
				.filter((r) => r.nombre !== 'Estudiante')
				.map((r) => r.nombre.toUpperCase()),
		);

		for (let i = 0; i < sheet.data.length; i++) {
			const raw = sheet.data[i];
			const fila = i + 2; // +2 porque fila 1 es el header

			const dni = dniKey ? String(raw[dniKey] ?? '').trim() : '';
			const nombres = nombresKey ? String(raw[nombresKey] ?? '').trim() : '';
			const apellidos = apellidosKey ? String(raw[apellidosKey] ?? '').trim() : '';
			const contrasena = contrasenaKey ? String(raw[contrasenaKey] ?? '').trim() : '';
			const rolRaw = rolKey ? String(raw[rolKey] ?? '').trim() : '';
			const sedeId = sedeKey ? parseId(raw[sedeKey]) : null;
			const telefono = telefonoKey ? String(raw[telefonoKey] ?? '').trim() || null : null;
			const correo = correoKey ? String(raw[correoKey] ?? '').trim() || null : null;

			// Validar fila
			const errors: string[] = [];
			if (!DNI_REGEX.test(dni)) errors.push('DNI inválido (8 dígitos)');
			if (!nombres) errors.push('Nombres requerido');
			if (!apellidos) errors.push('Apellidos requerido');
			if (!contrasena) errors.push('Contraseña requerida');
			if (!rolRaw || !rolesValidos.has(rolRaw.toUpperCase())) errors.push('Rol inválido');

			const valido = errors.length === 0;

			rows.push({
				fila,
				dni,
				nombres,
				apellidos,
				contrasena,
				rol: rolRaw,
				sedeId,
				telefono,
				correo,
				valido,
				error: valido ? null : errors.join(', '),
			});
		}

		return rows;
	}
	// #endregion
}
// #endregion
