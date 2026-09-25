// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EduButton } from '@edu-ui';

import { BulkGenerateFormComponent } from '../bulk-generate-form/bulk-generate-form.component';
import { CalificacionesImportDialogComponent } from '../calificaciones-import-dialog/calificaciones-import-dialog.component';
import { BulkTestDataFacade } from '../../services';
import { CreacionMasivaResponseDto, CrearNotaDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Panel de creación masiva de Calificaciones (notas) de prueba (P107 F5) — combina generación
 * sintética (BulkGenerateFormComponent genérico, endpoint solo pide `cantidad`, el backend crea
 * la evaluación si no existe una válida) con importación de lote desde archivo
 * (CalificacionesImportDialogComponent). Sin borrado masivo — F6 (brief 713/712) todavía no
 * implementó el endpoint de delete.
 */
@Component({
	selector: 'app-calificaciones-bulk-create',
	standalone: true,
	imports: [BulkGenerateFormComponent, CalificacionesImportDialogComponent, EduButton],
	templateUrl: './calificaciones-bulk-create.component.html',
	styleUrl: './calificaciones-bulk-create.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalificacionesBulkCreateComponent {
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
			.generarCalificaciones(cantidad)
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

	onImportar(notas: CrearNotaDto[]): void {
		this.importing.set(true);
		this.facade
			.loteCalificaciones(notas)
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
