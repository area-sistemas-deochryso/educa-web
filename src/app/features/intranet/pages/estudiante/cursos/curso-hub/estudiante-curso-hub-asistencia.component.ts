import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EduButton, EduSpinner, EduTable, EduTag, EduTooltip } from '@edu-ui';
import { CursoHubContextService, EmptyStateComponent } from '@intranet-shared/components';
import { createClientPaging } from '@shared/utils';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { ESTADO_ASISTENCIA_LABELS, ESTADO_ASISTENCIA_SEVERITIES } from '../../models/estudiante.models';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * Pestaña Mi Asistencia del hub de curso del estudiante (`…/asistencia`).
 *
 * La asistencia depende del `horarioId` de la franja elegida (no del contenido: una
 * franja sin contenido igual tiene asistencia), así que la pestaña la pide con
 * `hubContext.slot().id` y solo muestra el resumen cuyo `horarioId` coincide con
 * esa franja, nunca el de otra. El shell sigue siendo dueño del reset al salir del hub.
 *
 * Solo consulta: justificar inasistencias vive en «Mi Asistencia» (se enlaza con la franja).
 */
@Component({
	selector: 'app-estudiante-curso-hub-asistencia',
	standalone: true,
	imports: [DatePipe, RouterLink, EduButton, EduSpinner, EduTable, EduTag, EduTooltip, EmptyStateComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.hub-asistencia {
			padding: 1rem;
		}
		.hub-asistencia__toolbar {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			margin-bottom: 0.5rem;
		}
		.stat-cards {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
			gap: 1rem;
			margin-bottom: 1rem;
		}
		.stat-card {
			padding: 1rem;
			border-radius: 8px;
			text-align: center;
		}
		.stat-card .stat-value {
			font-size: 1.5rem;
			font-weight: 700;
		}
		.stat-card .stat-label {
			font-size: 0.85rem;
			opacity: 0.8;
		}
		.stat-success {
			background: var(--green-50);
			color: var(--green-700);
		}
		.stat-warn {
			background: var(--yellow-50);
			color: var(--yellow-700);
		}
		.stat-danger {
			background: var(--red-50);
			color: var(--red-700);
		}
		.stat-info {
			background: var(--blue-50);
			color: var(--blue-700);
		}
	`,
	template: `
		<div class="hub-asistencia">
			@if (resumen(); as asistencia) {
				<div class="hub-asistencia__toolbar">
					@if (asistencia.totalFalto > 0) {
						<a
							routerLink="/intranet/estudiante/asistencia"
							[queryParams]="{ horarioId: asistencia.horarioId }"
							data-info-anchor="estudiante-curso-hub-justificar"
						>
							Justificar inasistencias
						</a>
					} @else {
						<span></span>
					}
					<edu-button
						icon="pi pi-refresh"
						[text]="true"
						[rounded]="true"
						size="small"
						data-info-anchor="estudiante-curso-hub-refresh-asistencia"
						(click)="onRefresh()"
						[disabled]="loading()"
						eduTooltip="Refrescar"
						eduTooltipPosition="top"
						[pt]="{ root: { 'aria-label': 'Refrescar asistencia' } }"
					/>
				</div>
				<div class="stat-cards">
					<div class="stat-card stat-success">
						<div class="stat-value">{{ asistencia.totalPresente }}</div>
						<div class="stat-label">Presente</div>
					</div>
					<div class="stat-card stat-warn">
						<div class="stat-value">{{ asistencia.totalTarde }}</div>
						<div class="stat-label">Tarde</div>
					</div>
					<div class="stat-card stat-danger">
						<div class="stat-value">{{ asistencia.totalFalto }}</div>
						<div class="stat-label">Faltó</div>
					</div>
					<div class="stat-card stat-info">
						<div class="stat-value">{{ porcentaje() }}%</div>
						<div class="stat-label">Asistencia</div>
					</div>
				</div>
				@if (asistencia.detalle.length > 0) {
					<edu-table
						[value]="detallePaging.value()"
						[paginator]="true"
						[rows]="10"
						[first]="detallePaging.first()"
						[totalRecords]="detallePaging.totalRecords()"
						styleClass="p-datatable-sm"
						(onPageChange)="detallePaging.onPageChange($event)"
					>
						<ng-template #header>
							<tr>
								<th>Fecha</th>
								<th>Estado</th>
								<th>Justificación</th>
							</tr>
						</ng-template>
						<ng-template #body let-item>
							<tr>
								<td>{{ item.fecha | date: 'dd/MM/yyyy' }}</td>
								<td><edu-tag [value]="estadoLabel(item.estado)" [severity]="estadoSeverity(item.estado)" /></td>
								<td>{{ item.justificacion ?? '—' }}</td>
							</tr>
						</ng-template>
					</edu-table>
				} @else {
					<app-empty-state icon="pi pi-check-square" title="Mi asistencia" message="Todavía no hay registros de asistencia." />
				}
			} @else if (loading()) {
				<div class="flex justify-content-center p-5">
					<edu-spinner strokeWidth="4" />
				</div>
			} @else {
				<div class="hub-asistencia__toolbar">
					<span></span>
					<edu-button
						icon="pi pi-refresh"
						[text]="true"
						[rounded]="true"
						size="small"
						data-info-anchor="estudiante-curso-hub-refresh-asistencia"
						(click)="onRefresh()"
						eduTooltip="Refrescar"
						eduTooltipPosition="top"
						[pt]="{ root: { 'aria-label': 'Refrescar asistencia' } }"
					/>
				</div>
				<app-empty-state icon="pi pi-check-square" title="Mi asistencia" message="No hay asistencia disponible para esta franja." />
			}
		</div>
	`,
})
export class EstudianteCursoHubAsistenciaComponent {
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly facade = inject(EstudianteCursosFacade);
	// #endregion

	// #region Estado derivado
	private readonly vm = this.facade.vm;
	private readonly slotId = computed(() => this.hubContext.slot()?.id ?? null);

	/** Resumen de la franja elegida; descarta el de otra franja que aún quede en el store. */
	protected readonly resumen = computed(() => {
		const resumen = this.vm().miAsistencia;
		return resumen && resumen.horarioId === this.slotId() ? resumen : null;
	});
	protected readonly loading = computed(() => this.vm().miAsistenciaLoading);
	protected readonly detallePaging = createClientPaging(computed(() => this.resumen()?.detalle ?? []));
	protected readonly porcentaje = computed(() => {
		const data = this.resumen();
		if (!data || data.totalClases === 0) return 0;
		return Math.round(((data.totalPresente + data.totalTarde) / data.totalClases) * 100);
	});
	// #endregion

	constructor() {
		// Se pide una vez por franja: el facade ignora lo ya cargado o en vuelo y cancela la de otra franja.
		effect(() => {
			const id = this.slotId();
			if (id === null) return;
			untracked(() => this.facade.loadMiAsistenciaForHub(id));
		});
	}

	protected onRefresh(): void {
		const id = this.slotId();
		if (id !== null) this.facade.refreshMiAsistenciaForHub(id);
	}

	protected estadoLabel(estado: string): string {
		return ESTADO_ASISTENCIA_LABELS[estado as keyof typeof ESTADO_ASISTENCIA_LABELS] ?? estado;
	}

	protected estadoSeverity(estado: string): TagSeverity {
		return (ESTADO_ASISTENCIA_SEVERITIES[estado as keyof typeof ESTADO_ASISTENCIA_SEVERITIES] ?? 'info') as TagSeverity;
	}
}
