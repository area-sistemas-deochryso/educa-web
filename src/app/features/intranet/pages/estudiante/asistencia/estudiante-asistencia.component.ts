import {
	Component,
	ChangeDetectionStrategy,
	computed,
	inject,
	signal,
	OnInit,
	DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { EstudianteApiService } from '../services/estudiante-api.service';
import {
	HorarioProfesorDto,
	MiAsistenciaCursoResumenDto,
	ESTADO_ASISTENCIA_LABELS,
	ESTADO_ASISTENCIA_SEVERITIES,
} from '../models/estudiante.models';

@Component({
	selector: 'app-estudiante-asistencia',
	standalone: true,
	imports: [CommonModule, FormsModule, Select, TagModule, TableModule, ProgressSpinnerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './estudiante-asistencia.component.scss',
	template: `
		<div class="p-4">
			<h2 class="mt-0 mb-3">Mi Asistencia</h2>

			@if (pageLoading()) {
				<div class="flex justify-content-center p-5">
					<p-progressSpinner strokeWidth="4" />
				</div>
			} @else if (cursoOptions().length === 0) {
				<div class="flex flex-column align-items-center p-5 text-color-secondary">
					<i class="pi pi-check-square text-4xl mb-3"></i>
					<p>No tienes cursos asignados</p>
				</div>
			} @else {
				@if (cursoOptions().length > 1) {
					<div class="filters-row mb-3">
						<p-select
							[options]="cursoOptions()"
							[(ngModel)]="selectedHorarioId"
							placeholder="Seleccionar curso"
							appendTo="body"
							(ngModelChange)="onCursoChange($event)"
						/>
					</div>
				}

				@if (asistenciaLoading()) {
					<div class="flex justify-content-center p-5">
						<p-progressSpinner strokeWidth="4" />
					</div>
				} @else if (asistencia()) {
					<!-- Stats -->
					<div class="stat-cards mb-4">
						<div class="stat-card stat-success">
							<div class="stat-value">{{ asistencia()!.totalPresente }}</div>
							<div class="stat-label">Presente</div>
						</div>
						<div class="stat-card stat-warn">
							<div class="stat-value">{{ asistencia()!.totalTarde }}</div>
							<div class="stat-label">Tarde</div>
						</div>
						<div class="stat-card stat-danger">
							<div class="stat-value">{{ asistencia()!.totalFalto }}</div>
							<div class="stat-label">Faltó</div>
						</div>
						<div class="stat-card stat-info">
							<div class="stat-value">{{ porcentaje() }}%</div>
							<div class="stat-label">Asistencia</div>
						</div>
					</div>

					<!-- Tabla detalle -->
					@if (asistencia()!.detalle.length > 0) {
						<p-table
							[value]="asistencia()!.detalle"
							[paginator]="true"
							[rows]="10"
							styleClass="p-datatable-sm"
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
									<td>{{ item.fecha | date : 'dd/MM/yyyy' }}</td>
									<td>
										<p-tag
											[value]="getEstadoLabel(item.estado)"
											[severity]="getEstadoSeverity(item.estado)"
										/>
									</td>
									<td>{{ item.justificacion || '-' }}</td>
								</tr>
							</ng-template>
						</p-table>
					} @else {
						<div class="flex flex-column align-items-center p-4 text-color-secondary">
							<p>No hay registros de asistencia</p>
						</div>
					}
				}
			}
		</div>
	`,
})
export class EstudianteAsistenciaComponent implements OnInit {
	// #region Dependencias
	private readonly api = inject(EstudianteApiService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	private readonly _horarios = signal<HorarioProfesorDto[]>([]);
	private readonly _pageLoading = signal(false);
	private readonly _asistencia = signal<MiAsistenciaCursoResumenDto | null>(null);
	private readonly _asistenciaLoading = signal(false);

	readonly pageLoading = this._pageLoading.asReadonly();
	readonly asistencia = this._asistencia.asReadonly();
	readonly asistenciaLoading = this._asistenciaLoading.asReadonly();

	selectedHorarioId = signal<number | null>(null);

	readonly cursoOptions = computed(() => {
		const horarios = this._horarios();
		const seen = new Map<string, boolean>();
		const options: { label: string; value: number }[] = [];

		for (const h of horarios) {
			const key = `${h.cursoId}-${h.salonId}`;
			if (!seen.has(key)) {
				seen.set(key, true);
				options.push({
					label: `${h.cursoNombre} - ${h.salonDescripcion}`,
					value: h.id,
				});
			}
		}

		return options.sort((a, b) => a.label.localeCompare(b.label));
	});

	readonly porcentaje = computed(() => {
		const data = this.asistencia();
		if (!data || data.totalClases === 0) return 0;
		return Math.round(((data.totalPresente + data.totalTarde) / data.totalClases) * 100);
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this._pageLoading.set(true);
		this.api
			.getMisHorarios()
			.pipe(withRetry({ tag: 'EstudianteAsistencia:loadHorarios' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (horarios) => {
					this._horarios.set(horarios);
					this._pageLoading.set(false);

					// Auto-select first if only one
					const opts = this.cursoOptions();
					if (opts.length === 1) {
						this.selectedHorarioId.set(opts[0].value);
						this.loadAsistencia(opts[0].value);
					}
				},
				error: (err) => {
					logger.error('EstudianteAsistencia: Error al cargar horarios', err);
					this._pageLoading.set(false);
				},
			});
	}
	// #endregion

	// #region Handlers
	onCursoChange(horarioId: number): void {
		this.selectedHorarioId.set(horarioId);
		this.loadAsistencia(horarioId);
	}

	getEstadoLabel(estado: string): string {
		return ESTADO_ASISTENCIA_LABELS[estado as keyof typeof ESTADO_ASISTENCIA_LABELS] ?? estado;
	}

	getEstadoSeverity(
		estado: string,
	): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
		return (ESTADO_ASISTENCIA_SEVERITIES[estado as keyof typeof ESTADO_ASISTENCIA_SEVERITIES] ??
			'info') as 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
	}
	// #endregion

	// #region Helpers privados
	private loadAsistencia(horarioId: number): void {
		this._asistenciaLoading.set(true);
		this.api
			.getMiAsistencia(horarioId)
			.pipe(withRetry({ tag: 'EstudianteAsistencia:load' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this._asistencia.set(data);
					this._asistenciaLoading.set(false);
				},
				error: (err) => {
					logger.error('EstudianteAsistencia: Error al cargar asistencia', err);
					this._asistenciaLoading.set(false);
				},
			});
	}
	// #endregion
}
