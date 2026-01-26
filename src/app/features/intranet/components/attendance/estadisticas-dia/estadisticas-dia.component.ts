import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EstadisticasDia } from '@core/services';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Componente presentacional para mostrar las estadísticas del día.
 * Usado por el Director para ver un resumen rápido.
 */
@Component({
	selector: 'app-estadisticas-dia',
	standalone: true,
	imports: [DatePipe, DecimalPipe, ButtonModule, TooltipModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (estadisticas()) {
			<div class="estadisticas-container">
				<div class="header-row">
					<p-button
						icon="pi pi-file-pdf"
						[loading]="downloadingPdf()"
						severity="danger"
						[text]="true"
						[rounded]="true"
						(onClick)="onDescargarPdf()"
						pTooltip="Descargar PDF de asistencia del día"
						tooltipPosition="top"
						aria-label="Descargar PDF de asistencia del día"
					/>
					<h3>Estadísticas del día - {{ estadisticas()!.fecha | date: 'EEEE d MMMM yyyy' }}</h3>
				</div>
				<div class="stats-grid">
					<div class="stat-card">
						<span class="stat-value">{{ estadisticas()!.totalEstudiantes }}</span>
						<span class="stat-label">Total estudiantes</span>
					</div>
					<div class="stat-card present">
						<span class="stat-value">{{ estadisticas()!.conEntrada }}</span>
						<span class="stat-label">Con entrada</span>
					</div>
					<div class="stat-card complete">
						<span class="stat-value">{{ estadisticas()!.asistenciasCompletas }}</span>
						<span class="stat-label">Asistencias completas</span>
					</div>
					<div class="stat-card absent">
						<span class="stat-value">{{ estadisticas()!.faltas }}</span>
						<span class="stat-label">Faltas</span>
					</div>
					<div class="stat-card percentage">
						<span class="stat-value"
							>{{ estadisticas()!.porcentajeAsistencia | number: '1.1-1' }}%</span
						>
						<span class="stat-label">Asistencia</span>
					</div>
				</div>
			</div>
		}
	`,
	styles: [
		`
			.estadisticas-container {
				margin-bottom: 1rem;
				padding: 1rem;
				background: var(--surface-card);
				border-radius: var(--border-radius);

				.header-row {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					margin-bottom: 1rem;
				}

				h3 {
					margin: 0;
					font-size: 1rem;
					font-weight: 600;
					color: var(--text-color);
					text-transform: capitalize;
				}
			}

			.stats-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
				gap: 0.75rem;
			}

			.stat-card {
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 0.75rem;
				background: var(--surface-ground);
				border-radius: var(--border-radius);
				border-left: 3px solid var(--surface-border);

				.stat-value {
					font-size: 1.5rem;
					font-weight: 700;
					color: var(--text-color);
				}

				.stat-label {
					font-size: 0.75rem;
					color: var(--text-color-secondary);
					text-align: center;
				}

				&.present {
					border-left-color: var(--blue-500);
					.stat-value {
						color: var(--blue-500);
					}
				}

				&.complete {
					border-left-color: var(--green-500);
					.stat-value {
						color: var(--green-500);
					}
				}

				&.absent {
					border-left-color: var(--red-500);
					.stat-value {
						color: var(--red-500);
					}
				}

				&.percentage {
					border-left-color: var(--purple-500);
					.stat-value {
						color: var(--purple-500);
					}
				}
			}
		`,
	],
})
export class EstadisticasDiaComponent {
	estadisticas = input.required<EstadisticasDia | null>();
	downloadingPdf = input<boolean>(false);

	descargarPdf = output<void>();

	onDescargarPdf(): void {
		this.descargarPdf.emit();
	}
}
