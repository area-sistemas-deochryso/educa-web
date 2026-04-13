import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

import { HealthExitPermissionDto } from '@features/intranet/pages/profesor/models';

@Component({
	selector: 'app-health-exit-list',
	standalone: true,
	imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule, SkeletonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (loading()) {
			<div class="skeleton-container">
				@for (i of skeletonRows; track $index) {
					<p-skeleton height="2.5rem" styleClass="mb-2" />
				}
			</div>
		} @else if (permisos().length === 0) {
			<div class="empty-state">
				<i class="pi pi-info-circle"></i>
				<span>No hay permisos de salida registrados</span>
			</div>
		} @else {
			<p-table [value]="permisos()" [rows]="5" [paginator]="permisos().length > 5" styleClass="p-datatable-sm">
				<ng-template #header>
					<tr>
						<th>Estudiante</th>
						<th>Fecha</th>
						<th>Hora Salida</th>
						<th>Síntomas</th>
						<th style="width: 80px">Acciones</th>
					</tr>
				</ng-template>
				<ng-template #body let-p>
					<tr>
						<td>{{ p.estudianteNombre }}</td>
						<td>{{ p.fecha }}</td>
						<td>{{ p.horaSalida }}</td>
						<td>
							<span
								[pTooltip]="p.sintomaDetalle || ''"
								tooltipPosition="top"
							>{{ p.sintomasDisplay }}</span>
						</td>
						<td>
							<button
								pButton
								icon="pi pi-times"
								class="p-button-rounded p-button-text p-button-danger p-button-sm"
								(click)="anular.emit(p.id)"
								pTooltip="Anular permiso"
								tooltipPosition="top"
								[pt]="{ root: { 'aria-label': 'Anular permiso' } }"
							></button>
						</td>
					</tr>
				</ng-template>
			</p-table>
		}
	`,
	styles: [
		`
			.empty-state {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				padding: 1rem;
				color: var(--text-color-secondary);
				font-style: italic;
			}

			.skeleton-container {
				display: flex;
				flex-direction: column;
				gap: 0.25rem;
			}

			::ng-deep .p-datatable {
				background: transparent;

				.p-datatable-table { background: transparent; }
				.p-datatable-thead > tr > th { background: transparent; }
				.p-datatable-tbody > tr { background: transparent; }
				.p-datatable-tbody > tr > td { background: transparent; }
				.p-paginator { background: transparent; }
			}
		`,
	],
})
export class HealthExitListComponent {
	readonly permisos = input<HealthExitPermissionDto[]>([]);
	readonly loading = input(false);
	readonly anular = output<number>();
	readonly skeletonRows = Array(3);
}
