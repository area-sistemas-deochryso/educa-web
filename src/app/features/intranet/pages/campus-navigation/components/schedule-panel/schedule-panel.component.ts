// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';

import { MiHorarioHoyItem } from '../../models';

// #endregion
// #region Implementation
@Component({
	selector: 'app-schedule-panel',
	standalone: true,
	imports: [ButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="schedule-panel">
			<h3 class="panel-title">
				<i class="pi pi-clock"></i>
				Mi Horario Hoy
			</h3>

			@if (!scheduleReady()) {
				<div class="skeleton-list">
					@for (_ of [1, 2, 3]; track $index) {
						<div class="skeleton-card"></div>
					}
				</div>
			} @else if (items().length === 0) {
				<div class="empty-state">
					<i class="pi pi-info-circle"></i>
					<p>No tienes clases programadas hoy</p>
				</div>
			} @else {
				<div class="schedule-list">
					@for (item of items(); track item.horarioId) {
						<div
							class="schedule-card"
							[class.active]="currentSalonId() === item.salonId"
						>
							<div class="time-badge">
								{{ item.horaInicio }} - {{ item.horaFin }}
							</div>
							<div class="card-body">
								<span class="course-name">{{ item.cursoNombre }}</span>
								<span class="salon-name">{{ item.salonDescripcion }}</span>
								@if (item.profesorNombre) {
									<span class="professor-name">
										<i class="pi pi-user"></i>
										{{ item.profesorNombre }}
									</span>
								}
							</div>
							<button
								pButton
								icon="pi pi-directions"
								class="p-button-sm p-button-text"
								label="Navegar"
								(click)="navigate.emit(item.salonId)"
								[pt]="{
									root: {
										'aria-label': 'Navegar a ' + item.salonDescripcion,
									},
								}"
							></button>
						</div>
					}
				</div>
			}
		</div>
	`,
	styles: `
		.schedule-panel {
			height: 100%;
			display: flex;
			flex-direction: column;
		}

		.panel-title {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin: 0 0 1rem;
			font-size: 1.1rem;
			font-weight: 600;
			color: var(--text-color);

			i {
				color: var(--primary-color);
			}
		}

		.schedule-list {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			overflow-y: auto;
			flex: 1;
		}

		.schedule-card {
			border: 1px solid var(--surface-border);
			border-radius: 8px;
			padding: 0.75rem;
			transition: all 0.2s;

			&:hover {
				border-color: var(--primary-color);
			}

			&.active {
				border-color: var(--primary-color);
				background: color-mix(in srgb, var(--primary-color) 8%, transparent);
			}
		}

		.time-badge {
			font-size: 0.75rem;
			font-weight: 700;
			color: var(--primary-color);
			margin-bottom: 0.25rem;
		}

		.card-body {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;
			margin-bottom: 0.5rem;
		}

		.course-name {
			font-weight: 600;
			font-size: 0.9rem;
		}

		.salon-name {
			font-size: 0.8rem;
			color: var(--text-color-secondary);
		}

		.professor-name {
			font-size: 0.78rem;
			color: var(--text-color-secondary);
			display: flex;
			align-items: center;
			gap: 0.25rem;

			i {
				font-size: 0.7rem;
			}
		}

		.empty-state {
			text-align: center;
			padding: 2rem 1rem;
			color: var(--text-color-secondary);

			i {
				font-size: 2rem;
				margin-bottom: 0.5rem;
			}

			p {
				margin: 0;
				font-size: 0.9rem;
			}
		}

		.skeleton-list {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
		}

		.skeleton-card {
			height: 90px;
			border-radius: 8px;
			background: var(--surface-200);
			animation: pulse 1.5s infinite;
		}

		@keyframes pulse {
			0%,
			100% {
				opacity: 1;
			}
			50% {
				opacity: 0.5;
			}
		}
	`,
})
export class SchedulePanelComponent {
	readonly items = input.required<MiHorarioHoyItem[]>();
	readonly scheduleReady = input(false);
	readonly currentSalonId = input<number | null>(null);
	readonly navigate = output<number>();
}
// #endregion
