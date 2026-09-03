// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EduButton } from '@edu-ui';

import { BulkGenerateFormComponent } from '../bulk-generate-form/bulk-generate-form.component';
import { CursosImportDialogComponent } from '../cursos-import-dialog/cursos-import-dialog.component';
import { BulkTestDataFacade } from '../../services';
import { CreacionMasivaResponseDto, CrearCursoDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Panel de creación masiva de Cursos de prueba (P107 F3) — compone el generador
 * sintético reusable y el diálogo de importación por archivo.
 */
@Component({
	selector: 'app-cursos-bulk-create',
	standalone: true,
	imports: [BulkGenerateFormComponent, CursosImportDialogComponent, EduButton],
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
}
// #endregion
