// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EduButton } from '@edu-ui';

import { BulkGenerateFormComponent } from '../bulk-generate-form/bulk-generate-form.component';
import { BulkDeleteActionComponent } from '../bulk-delete-action/bulk-delete-action.component';
import { CursosImportDialogComponent } from '../cursos-import-dialog/cursos-import-dialog.component';
import { BulkTestDataFacade } from '../../services';
import { BorradoMasivoResponseDto, CreacionMasivaResponseDto, CrearCursoDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Panel de creación masiva de Cursos de prueba (P107 F3) — compone el generador
 * sintético reusable, el diálogo de importación por archivo y el borrado masivo
 * (BulkDeleteActionComponent, P107 F4).
 */
@Component({
	selector: 'app-cursos-bulk-create',
	standalone: true,
	imports: [BulkGenerateFormComponent, CursosImportDialogComponent, BulkDeleteActionComponent, EduButton],
	templateUrl: './cursos-bulk-create.component.html',
	styleUrl: './cursos-bulk-create.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursosBulkCreateComponent {
	private readonly facade = inject(BulkTestDataFacade);
	private readonly destroyRef = inject(DestroyRef);

	readonly generating = signal(false);
	readonly generateResult = signal<CreacionMasivaResponseDto | null>(null);

	readonly importDialogVisible = signal(false);
	readonly importing = signal(false);
	readonly importResult = signal<CreacionMasivaResponseDto | null>(null);

	readonly deleting = signal(false);
	readonly deleteResult = signal<BorradoMasivoResponseDto | null>(null);

	onGenerar(cantidad: number): void {
		this.generating.set(true);
		this.facade
			.generarCursos(cantidad)
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

	onImportar(cursos: CrearCursoDto[]): void {
		this.importing.set(true);
		this.facade
			.loteCursos(cursos)
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
			.eliminarCursosPrueba()
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
