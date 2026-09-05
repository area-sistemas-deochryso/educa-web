// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EduButton } from '@edu-ui';

import { UsuariosGenerateFormComponent } from '../usuarios-generate-form/usuarios-generate-form.component';
import { UsuariosImportDialogComponent } from '../usuarios-import-dialog/usuarios-import-dialog.component';
import { BulkDeleteActionComponent } from '../bulk-delete-action/bulk-delete-action.component';
import { BulkTestDataFacade } from '../../services';
import { BorradoMasivoResponseDto, CreacionMasivaResponseDto, CrearUsuarioDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Panel de creación masiva de Usuarios de prueba (P107 F3c) — combina generación sintética
 * (UsuariosGenerateFormComponent, con selector de Rol) con importación de lote desde archivo
 * (UsuariosImportDialogComponent, roles mixtos) y el borrado masivo (BulkDeleteActionComponent, P107 F4b).
 */
@Component({
	selector: 'app-usuarios-bulk-create',
	standalone: true,
	imports: [UsuariosGenerateFormComponent, UsuariosImportDialogComponent, BulkDeleteActionComponent, EduButton],
	templateUrl: './usuarios-bulk-create.component.html',
	styleUrl: './usuarios-bulk-create.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosBulkCreateComponent {
	private readonly facade = inject(BulkTestDataFacade);
	private readonly destroyRef = inject(DestroyRef);

	readonly generating = signal(false);
	readonly generateResult = signal<CreacionMasivaResponseDto | null>(null);

	readonly importDialogVisible = signal(false);
	readonly importing = signal(false);
	readonly importResult = signal<CreacionMasivaResponseDto | null>(null);

	readonly deleting = signal(false);
	readonly deleteResult = signal<BorradoMasivoResponseDto | null>(null);

	onGenerar(event: { rol: string; cantidad: number }): void {
		this.generating.set(true);
		this.facade
			.generarUsuarios(event.rol, event.cantidad)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.generateResult.set(result);
					this.generating.set(false);
				},
				error: () => {
					this.generating.set(false);
				},
			});
	}

	onAbrirImportDialog(): void {
		this.importResult.set(null);
		this.importDialogVisible.set(true);
	}

	onImportDialogVisibleChange(visible: boolean): void {
		this.importDialogVisible.set(visible);
	}

	onImportar(usuarios: CrearUsuarioDto[]): void {
		this.importing.set(true);
		this.facade
			.loteUsuarios(usuarios)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.importResult.set(result);
					this.importing.set(false);
				},
				error: () => {
					this.importing.set(false);
				},
			});
	}

	onEliminarPrueba(): void {
		this.deleting.set(true);
		this.facade
			.eliminarUsuariosPrueba()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.deleteResult.set(result);
					this.deleting.set(false);
				},
				error: () => {
					this.deleting.set(false);
				},
			});
	}
}
// #endregion
