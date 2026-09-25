// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EduButton } from '@edu-ui';

import { BulkGenerateFormComponent } from '../bulk-generate-form/bulk-generate-form.component';
import { MatriculasImportDialogComponent } from '../matriculas-import-dialog/matriculas-import-dialog.component';
import { BulkTestDataFacade } from '../../services';
import { CreacionMasivaResponseDto, CrearMatriculaDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Panel de creación masiva de Matrículas de prueba (P107 F5) — combina generación sintética
 * (BulkGenerateFormComponent genérico, endpoint solo pide `cantidad`) con importación de lote
 * desde archivo (MatriculasImportDialogComponent). Sin borrado masivo — F6 (brief 713/712)
 * todavía no implementó el endpoint de delete.
 */
@Component({
	selector: 'app-matriculas-bulk-create',
	standalone: true,
	imports: [BulkGenerateFormComponent, MatriculasImportDialogComponent, EduButton],
	templateUrl: './matriculas-bulk-create.component.html',
	styleUrl: './matriculas-bulk-create.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatriculasBulkCreateComponent {
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
			.generarMatriculas(cantidad)
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

	onImportar(matriculas: CrearMatriculaDto[]): void {
		this.importing.set(true);
		this.facade
			.loteMatriculas(matriculas)
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
