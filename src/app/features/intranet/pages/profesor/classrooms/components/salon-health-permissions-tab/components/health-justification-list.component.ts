import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

import { HealthJustificationDto } from '@features/intranet/pages/profesor/models';

@Component({
	selector: 'app-health-justification-list',
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
		} @else if (justificaciones().length === 0) {
			<div class="empty-state">
				<i class="pi pi-info-circle"></i>
				<span>No hay justificaciones médicas registradas</span>
			</div>
		} @else {
			<p-table [value]="justificaciones()" [rows]="5" [paginator]="justificaciones().length > 5" styleClass="p-datatable-sm">
				<ng-template #header>
					<tr>
						<th>Estudiante</th>
						<th>Días</th>
						<th>Documento</th>
						<th>Fecha Registro</th>
						<th style="width: 80px">Acciones</th>
					</tr>
				</ng-template>
				<ng-template #body let-j>
					<tr>
						<td>{{ j.estudianteNombre }}</td>
						<td>
							<span
								[pTooltip]="formatDias(j)"
								tooltipPosition="top"
							>{{ j.dias.length }} día{{ j.dias.length > 1 ? 's' : '' }}</span>
						</td>
						<td>
							<a
								[href]="j.documentoUrl"
								target="_blank"
								rel="noopener noreferrer"
								class="doc-link"
							>
								<i class="pi pi-file-pdf"></i>
								{{ j.documentoNombre }}
							</a>
						</td>
						<td>{{ j.fechaRegistro }}</td>
						<td>
							<button
								pButton
								icon="pi pi-times"
								class="p-button-rounded p-button-text p-button-danger p-button-sm"
								(click)="anular.emit(j.id)"
								pTooltip="Anular justificación"
								tooltipPosition="top"
								[pt]="{ root: { 'aria-label': 'Anular justificación' } }"
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

			.doc-link {
				color: #1e40af;
				text-decoration: none;
				display: inline-flex;
				align-items: center;
				gap: 0.25rem;

				&:hover {
					text-decoration: underline;
				}
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
export class HealthJustificationListComponent {
	readonly justificaciones = input<HealthJustificationDto[]>([]);
	readonly loading = input(false);
	readonly anular = output<number>();
	readonly skeletonRows = Array(3);

	formatDias(j: HealthJustificationDto): string {
		return j.dias.map((d) => d.fecha).join(', ');
	}
}
