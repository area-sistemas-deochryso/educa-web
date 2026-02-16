import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ProfesorSalonConEstudiantes } from '../../../services/profesor.store';

@Component({
	selector: 'app-salon-estudiantes-dialog',
	standalone: true,
	imports: [CommonModule, DialogModule, TabsModule, TableModule, TagModule, SkeletonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host ::ng-deep .p-datatable {
			--p-datatable-header-cell-background: transparent;
			--p-datatable-row-background: transparent;
		}
	`,
	template: `
		<p-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[style]="{ width: '600px', maxWidth: '95vw' }"
			[header]="salon()?.salonDescripcion ?? 'Salón'"
		>
			@if (salon(); as s) {
				<p-tabs value="0">
					<p-tablist>
						<p-tab value="0">
							<i class="pi pi-users mr-2"></i>Estudiantes
							@if (!dialogLoading()) {
								<p-tag
									[value]="s.cantidadEstudiantes.toString()"
									severity="info"
									[rounded]="true"
									class="ml-2"
								/>
							}
						</p-tab>
						<p-tab value="1" [disabled]="true">
							<i class="pi pi-book mr-2"></i>Notas
						</p-tab>
					</p-tablist>

					<p-tabpanels>
						<!-- #region Tab Estudiantes -->
						<p-tabpanel value="0">
							@if (dialogLoading()) {
								<div class="flex flex-column gap-2 p-2">
									@for (_ of skeletonRows; track $index) {
										<p-skeleton height="2rem" />
									}
								</div>
							} @else if (s.estudiantes.length === 0) {
								<div
									class="flex flex-column align-items-center p-4 text-color-secondary"
								>
									<i class="pi pi-users text-3xl mb-2"></i>
									<p>No hay estudiantes en este salón</p>
								</div>
							} @else {
								<p-table
									[value]="s.estudiantes"
									[rows]="10"
									[paginator]="s.estudiantes.length > 10"
									styleClass="p-datatable-sm"
								>
									<ng-template #header>
										<tr>
											<th style="width: 50px">#</th>
											<th style="width: 120px">DNI</th>
											<th>Nombre Completo</th>
										</tr>
									</ng-template>
									<ng-template #body let-est let-i="rowIndex">
										<tr>
											<td class="text-color-secondary">{{ i + 1 }}</td>
											<td class="font-mono">{{ est.dni }}</td>
											<td class="font-semibold">{{ est.nombreCompleto }}</td>
										</tr>
									</ng-template>
								</p-table>
							}
						</p-tabpanel>

						<!-- #endregion -->
						<!-- #region Tab Notas (placeholder) -->
						<p-tabpanel value="1">
							<div
								class="flex flex-column align-items-center p-5 text-color-secondary"
							>
								<i class="pi pi-clock text-4xl mb-3"></i>
								<p class="text-lg font-semibold">Proximamente</p>
								<p class="text-sm">
									El sistema de notas estará disponible pronto
								</p>
							</div>
						</p-tabpanel>
					</p-tabpanels>
				</p-tabs>
			}
		</p-dialog>
	`,
})
export class SalonEstudiantesDialogComponent {
	readonly visible = input.required<boolean>();
	readonly salon = input.required<ProfesorSalonConEstudiantes | null>();
	readonly dialogLoading = input<boolean>(false);

	readonly visibleChange = output<boolean>();

	readonly skeletonRows = Array(5);

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}
}
