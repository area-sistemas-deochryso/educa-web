// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EduButton } from '@edu-ui';

import { BulkGenerateFormComponent } from '../bulk-generate-form/bulk-generate-form.component';
import { SalonesImportDialogComponent } from '../salones-import-dialog/salones-import-dialog.component';
import { BulkTestDataFacade } from '../../services';
import { CreacionMasivaResponseDto, CrearSalonDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Panel de creación masiva de Salones de prueba (P107 F3) — combina generación sintética
 * (BulkGenerateFormComponent) con importación de lote desde archivo (SalonesImportDialogComponent).
 */
@Component({
	selector: 'app-salones-bulk-create',
	standalone: true,
	imports: [BulkGenerateFormComponent, SalonesImportDialogComponent, EduButton],
	templateUrl: './salones-bulk-create.component.html',
	styleUrl: './salones-bulk-create.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonesBulkCreateComponent {
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
			.generarSalones(cantidad)
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

	onImportar(salones: CrearSalonDto[]): void {
		this.importing.set(true);
		this.facade
			.loteSalones(salones)
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
