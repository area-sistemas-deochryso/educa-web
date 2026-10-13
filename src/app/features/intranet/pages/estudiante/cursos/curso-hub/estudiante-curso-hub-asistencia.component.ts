import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EduButton, EduTable, EduTag, EduTooltip } from '@edu-ui';
import {
	AttendanceCalendarComponent,
	CursoHubContextService,
	EmptyStateComponent,
	StatsSkeletonComponent,
	TableSkeletonComponent,
} from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';
import {
	ATTENDANCE_EMPTY_LABEL,
	ATTENDANCE_PERCENTAGE_LEGEND,
	calcAttendancePercentage,
	createClientPaging,
} from '@shared/utils';
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
	imports: [
		DatePipe,
		RouterLink,
		EduButton,
		EduTable,
		EduTag,
		EduTooltip,
		AttendanceCalendarComponent,
		EmptyStateComponent,
		StatsSkeletonComponent,
		TableSkeletonComponent,
	],
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
		app-attendance-calendar {
			display: block;
			margin-bottom: 1rem;
		}
		.asistencia-kpis {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 2fr);
			gap: 0.75rem;
			margin-bottom: 1rem;
		}
		/* No usar .stat-card: styles.scss lo fuerza a transparente (design-system §1). Tonos --tint-* (traen dark). */
		.asistencia-kpi {
			padding: 1rem;
			border-radius: 8px;
			border: 1px solid var(--kpi-border);
			background: var(--kpi-bg);
			color: var(--kpi-text);
			text-align: center;
		}
		.asistencia-kpi .stat-value {
			font-size: 1.5rem;
			font-weight: 700;
			line-height: 1.2;
		}
		.asistencia-kpi .stat-label {
			font-size: 0.85rem;
			font-weight: 500;
		}
		.asistencia-kpi .stat-legend {
			margin-top: 0.25rem;
			font-size: 0.75rem;
		}
		.asistencia-kpi--success {
			--kpi-bg: var(--tint-success-bg);
			--kpi-border: var(--tint-success-border);
			--kpi-text: var(--tint-success-text);
		}
		.asistencia-kpi--warn {
			--kpi-bg: var(--tint-warning-bg);
			--kpi-border: var(--tint-warning-border);
			--kpi-text: var(--tint-warning-text);
		}
		.asistencia-kpi--danger {
			--kpi-bg: var(--tint-danger-bg);
			--kpi-border: var(--tint-danger-border);
			--kpi-text: var(--tint-danger-text);
		}
		.asistencia-kpi--info {
			--kpi-bg: var(--tint-info-bg);
			--kpi-border: var(--tint-info-border);
			--kpi-text: var(--tint-info-text);
		}
		@media (max-width: 639.98px) {
			.asistencia-kpis {
				grid-template-columns: repeat(3, minmax(0, 1fr));
				gap: 0.5rem;
			}
			.asistencia-kpi {
				padding: 0.75rem 0.5rem;
			}
			.asistencia-kpi--wide {
				grid-column: 1 / -1;
			}
			/* Filas como tarjetas: fecha + estado, justificación debajo si existe. */
			tr.asistencia-head {
				display: none;
			}
			tr.asistencia-row {
				display: flex;
				flex-wrap: wrap;
				align-items: center;
				gap: 0.25rem 0.75rem;
				padding: 0.75rem 1rem;
				border-bottom: 1px solid var(--surface-border);
			}
			tr.asistencia-row > td {
				display: block;
				width: auto;
				padding: 0;
				border: 0;
				text-align: left;
			}
			tr.asistencia-row > td.asistencia-justificacion {
				flex-basis: 100%;
				font-size: 0.85rem;
				color: var(--text-color-secondary);
			}
			tr.asistencia-row > td.asistencia-justificacion--vacia {
				display: none;
			}
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
				<div class="asistencia-kpis">
					<div class="asistencia-kpi asistencia-kpi--success">
						<div class="stat-value">{{ asistencia.totalPresente }}</div>
						<div class="stat-label">Presente</div>
					</div>
					<div class="asistencia-kpi asistencia-kpi--warn">
						<div class="stat-value">{{ asistencia.totalTarde }}</div>
						<div class="stat-label">Tarde</div>
					</div>
					<div class="asistencia-kpi asistencia-kpi--danger">
						<div class="stat-value">{{ asistencia.totalFalto }}</div>
						<div class="stat-label">Faltó</div>
					</div>
					<div class="asistencia-kpi asistencia-kpi--info asistencia-kpi--wide">
						@if (porcentaje() === null) {
							<div class="stat-value">{{ emptyLabel }}</div>
							<div class="stat-label">Asistencia</div>
						} @else {
							<div class="stat-value">{{ porcentaje() }}%</div>
							<div class="stat-label">Asistencia</div>
							<div class="stat-legend">{{ legend }}</div>
						}
					</div>
				</div>
				@for (horarioId of [asistencia.horarioId]; track horarioId) {
					<app-attendance-calendar [days]="asistencia.detalle" />
				}
				@if (asistencia.detalle.length > 0) {
					<edu-table
						[value]="detallePaging.value()"
						[paginator]="detallePaging.totalRecords() > 10"
						[rows]="10"
						[first]="detallePaging.first()"
						[totalRecords]="detallePaging.totalRecords()"
						styleClass="p-datatable-sm"
						(onPageChange)="detallePaging.onPageChange($event)"
					>
						<ng-template #header>
							<tr class="asistencia-head">
								<th>Fecha</th>
								<th>Estado</th>
								@if (hayJustificaciones()) {
									<th>Justificación</th>
								}
							</tr>
						</ng-template>
						<ng-template #body let-item>
							<tr class="asistencia-row">
								<td>{{ item.fecha | date: 'dd/MM/yyyy' }}</td>
								<td>
									<edu-tag [value]="estadoLabel(item.estado)" [severity]="estadoSeverity(item.estado)" />
									@if (item.esRecuperacion) {
										<edu-tag value="Recuperación" severity="info" />
									}
								</td>
								@if (hayJustificaciones()) {
									<td class="asistencia-justificacion" [class.asistencia-justificacion--vacia]="!item.justificacion">{{ item.justificacion ?? '—' }}</td>
								}
							</tr>
						</ng-template>
					</edu-table>
				} @else {
					<app-empty-state icon="pi pi-check-square" title="Mi asistencia" message="Todavía no hay registros de asistencia." />
				}
			} @else if (loading()) {
				<app-stats-skeleton [count]="4" />
				<app-table-skeleton [columns]="skeletonColumns" [rows]="4" minHeight="220px" />
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
				<app-empty-state icon="pi pi-check-square" title="Mi asistencia" message="No hay asistencia disponible para este curso." />
			}
		</div>
	`,
})
export class EstudianteCursoHubAsistenciaComponent {
	/** Reserva el espacio de la tabla (Fecha / Estado / Justificación) mientras llega la asistencia. */
	protected readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: '120px', cellType: 'text' },
		{ width: '120px', cellType: 'badge' },
		{ width: 'flex', cellType: 'text' },
	];

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
	/** La columna «Justificación» solo se muestra si alguna fila (de cualquier página) trae justificación. */
	protected readonly hayJustificaciones = computed(
		() => this.resumen()?.detalle.some((item) => !!item.justificacion) ?? false,
	);
	protected readonly emptyLabel = ATTENDANCE_EMPTY_LABEL;
	protected readonly legend = ATTENDANCE_PERCENTAGE_LEGEND;
	protected readonly porcentaje = computed(() => {
		const data = this.resumen();
		if (!data) return null;
		return calcAttendancePercentage(data.totalPresente, data.totalTarde, data.totalClases);
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
