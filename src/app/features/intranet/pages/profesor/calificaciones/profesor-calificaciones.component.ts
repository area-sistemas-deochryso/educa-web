import {
	Component,
	ChangeDetectionStrategy,
	computed,
	inject,
	signal,
	OnInit,
	OnDestroy,
	DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { PageHeaderComponent } from '@shared/components';
import { ProfesorFacade } from '../services/profesor.facade';
import { ProfesorApiService } from '../services/profesor-api.service';
import { CursoContenidoStore } from '../cursos/services/curso-contenido.store';
import { CalificacionesFacade } from '../cursos/services/calificaciones.facade';
import { CalificacionesPanelComponent } from '../cursos/components/calificaciones-panel/calificaciones-panel.component';
import { CalificarDialogComponent } from '../cursos/components/calificar-dialog/calificar-dialog.component';
import { EvaluacionFormDialogComponent } from '../cursos/components/evaluacion-form-dialog/evaluacion-form-dialog.component';
import { PeriodosConfigDialogComponent } from '../cursos/components/periodos-config-dialog/periodos-config-dialog.component';
import { CalificacionesGridComponent } from './components/calificaciones-grid/calificaciones-grid.component';
import {
	CalificacionDto,
	CalificacionConNotasDto,
	CrearCalificacionDto,
	CalificarLoteDto,
	CalificarGruposLoteDto,
	CrearPeriodoDto,
	CambiarTipoCalificacionDto,
	CursoContenidoDetalleDto,
} from '../models';

@Component({
	selector: 'app-profesor-calificaciones',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		Select,
		ProgressSpinnerModule,
		ConfirmDialogModule,
		PageHeaderComponent,
		CalificacionesPanelComponent,
		CalificarDialogComponent,
		EvaluacionFormDialogComponent,
		PeriodosConfigDialogComponent,
		CalificacionesGridComponent,
	],
	providers: [ConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
		.filters-row {
			display: flex;
			align-items: center;
			gap: 1rem;
			flex-wrap: wrap;
		}
		.vista-toggle {
			display: flex;
			gap: 0.5rem;
			margin-bottom: 1rem;
		}
	`,
	template: `
		<app-page-header icon="pi pi-chart-bar" title="Calificaciones" />
		<div class="p-4 pt-0">

			@if (pageLoading()) {
				<div class="flex justify-content-center p-5">
					<p-progressSpinner strokeWidth="4" />
				</div>
			} @else if (cursoOptions().length === 0) {
				<div class="flex flex-column align-items-center p-5 text-color-secondary">
					<i class="pi pi-chart-bar text-4xl mb-3"></i>
					<p>No tienes cursos asignados</p>
				</div>
			} @else {
				<div class="filters-row mb-3">
					<p-select
						[options]="cursoOptions()"
						[(ngModel)]="selectedHorarioId"
						placeholder="Seleccionar curso"
						appendTo="body"
						(ngModelChange)="onCursoChange($event)"
					/>
				</div>

				@if (contenidoLoading()) {
					<div class="flex justify-content-center p-5">
						<p-progressSpinner strokeWidth="4" />
					</div>
				} @else if (contenido()) {
					@if (calVm().calificaciones.length > 0) {
						<div class="vista-toggle">
							<button pButton [outlined]="vistaActual() !== 'lista'" label="Lista" icon="pi pi-list" (click)="onVistaChange('lista')" class="p-button-sm"></button>
							<button pButton [outlined]="vistaActual() !== 'planilla'" label="Planilla" icon="pi pi-table" (click)="onVistaChange('planilla')" class="p-button-sm"></button>
						</div>
					}

					@if (vistaActual() === 'lista') {
						<app-calificaciones-panel
							[calificacionesPorSemana]="calVm().calificacionesPorSemana"
							[periodos]="calVm().periodos"
							[loading]="calVm().loading"
							[saving]="calVm().saving"
							[totalEvaluaciones]="calVm().totalEvaluaciones"
							(crearEvaluacion)="calFacade.openCalificacionDialog()"
							(editarEvaluacion)="calFacade.openCalificacionDialog($event)"
							(calificarEstudiantes)="calFacade.openCalificarDialog($event)"
							(eliminarEvaluacion)="onEliminar($event)"
							(cambiarTipo)="onCambiarTipo($event)"
							(configurarPeriodos)="calFacade.openPeriodosDialog()"
						/>
					}

					@if (vistaActual() === 'planilla') {
						<app-calificaciones-grid
							[calificaciones]="calVm().calificaciones"
							[estudiantes]="estudiantesForCalificar()"
							[saving]="calVm().saving"
							(notaChange)="onNotaChange($event)"
						/>
					}

					<!-- Dialogs -->
					<app-evaluacion-form-dialog
						[visible]="calVm().calificacionDialogVisible"
						[saving]="calVm().saving"
						[editing]="calVm().editingCalificacion"
						[semanas]="contenido()!.semanas"
						[contenidoId]="contenido()!.id"
						(visibleChange)="onEvalDialogVisibleChange($event)"
						(save)="onCrearCalificacion($event)"
					/>

					<app-calificar-dialog
						[visible]="calVm().calificarDialogVisible"
						[saving]="calVm().saving"
						[calificacion]="calVm().selectedCalificacion"
						[estudiantes]="estudiantesForCalificar()"
						[grupos]="calVm().gruposForCalificar"
						(visibleChange)="onCalificarDialogVisibleChange($event)"
						(save)="onCalificarLote($event)"
						(saveGrupos)="onCalificarGruposLote($event)"
					/>

					<app-periodos-config-dialog
						[visible]="calVm().periodosDialogVisible"
						[saving]="calVm().saving"
						[periodos]="calVm().periodos"
						[contenidoId]="contenido()!.id"
						[totalSemanas]="contenido()!.numeroSemanas"
						(visibleChange)="onPeriodosDialogVisibleChange($event)"
						(crearPeriodo)="calFacade.crearPeriodo($event)"
						(eliminarPeriodo)="calFacade.eliminarPeriodo($event)"
					/>

					<p-confirmDialog (onHide)="onConfirmDialogHide()" />
				}
			}
		</div>
	`,
})
export class ProfesorCalificacionesComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly api = inject(ProfesorApiService);
	private readonly contenidoStore = inject(CursoContenidoStore);
	readonly calFacade = inject(CalificacionesFacade);
	private readonly confirmationService = inject(ConfirmationService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado local
	selectedHorarioId = signal<number | null>(null);
	vistaActual = signal<'lista' | 'planilla'>('lista');
	private readonly _contenidoLoading = signal(false);
	private readonly _contenido = signal<CursoContenidoDetalleDto | null>(null);

	readonly pageLoading = computed(() => this.facade.vm().loading);
	readonly contenidoLoading = this._contenidoLoading.asReadonly();
	readonly contenido = this._contenido.asReadonly();
	readonly calVm = this.calFacade.vm;

	/**
	 * Deduplica horarios por cursoId+salonId porque un profesor puede tener
	 * múltiples bloques horarios del mismo curso en el mismo salón (ej: Lunes y Miércoles).
	 * El value es el horarioId del primer bloque encontrado (suficiente para identificar el curso-salón).
	 */
	readonly cursoOptions = computed(() => {
		const horarios = this.facade.vm().horarios;
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

	/** Mapea estudiantes del salón al formato simplificado que espera el componente de calificaciones */
	readonly estudiantesForCalificar = computed(() => {
		return this.calVm().salonEstudiantes.map((e) => ({
			id: e.estudianteId,
			nombre: e.nombreCompleto,
		}));
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		if (this.facade.vm().horarios.length === 0) {
			this.facade.loadData();
		}
	}

	ngOnDestroy(): void {
		this.calFacade.resetCalificaciones();
	}
	// #endregion

	// #region Handlers
	onVistaChange(vista: 'lista' | 'planilla'): void {
		this.vistaActual.set(vista);
	}

	onNotaChange(event: { calificacionId: number; estudianteId: number; nota: number | null }): void {
		if (event.nota === null) return;
		const cont = this.contenido();
		if (!cont) return;
		this.calFacade.calificarLote(event.calificacionId, {
			notas: [{ estudianteId: event.estudianteId, nota: event.nota, observacion: null }],
		}, cont.id);
	}

	onCursoChange(horarioId: number): void {
		this.selectedHorarioId.set(horarioId);
		this.calFacade.resetCalificaciones();
		this._contenido.set(null);
		this._contenidoLoading.set(true);

		this.api
			.getContenido(horarioId)
			.pipe(
				withRetry({ tag: 'ProfesorCalificaciones:loadContenido' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (contenido) => {
					if (!contenido) {
						this._contenidoLoading.set(false);
						return;
					}
					this._contenido.set(contenido);
					// Resolver salonId del horario y almacenarlo en el store del feature
					const horario = this.facade.vm().horarios.find((h) => h.id === horarioId);
					this.contenidoStore.setContenido(contenido);
					this.contenidoStore.setSalonId(horario?.salonId ?? null);
					this.calFacade.loadCalificaciones(contenido.id);
					this._contenidoLoading.set(false);
				},
				error: (err) => {
					logger.error('ProfesorCalificaciones: Error al cargar contenido', err);
					this._contenidoLoading.set(false);
				},
			});
	}

	onCrearCalificacion(dto: CrearCalificacionDto): void {
		this.calFacade.crearCalificacion(dto);
	}

	onCalificarLote(dto: CalificarLoteDto): void {
		const cal = this.calVm().selectedCalificacion;
		const cont = this.contenido();
		if (!cal || !cont) return;
		this.calFacade.calificarLote(cal.id, dto, cont.id);
	}

	onCalificarGruposLote(dto: CalificarGruposLoteDto): void {
		const cal = this.calVm().selectedCalificacion;
		const cont = this.contenido();
		if (!cal || !cont) return;
		this.calFacade.calificarGruposLote(cal.id, dto, cont.id);
	}

	onEliminar(cal: CalificacionConNotasDto): void {
		this.confirmationService.confirm({
			message: `¿Eliminar la evaluación "${cal.titulo}"?`,
			header: 'Confirmar Eliminación',
			accept: () => this.calFacade.eliminarCalificacion(cal.id),
		});
	}

	onCambiarTipo(cal: CalificacionConNotasDto): void {
		const dto: CambiarTipoCalificacionDto = { esGrupal: !cal.esGrupal };
		this.calFacade.cambiarTipo(cal.id, dto);
	}
	// #endregion

	// #region Dialog handlers
	onEvalDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closeCalificacionDialog();
	}

	onCalificarDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closeCalificarDialog();
	}

	onPeriodosDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closePeriodosDialog();
	}

	onConfirmDialogHide(): void {
		// ConfirmDialog closed — no store state to sync
	}
	// #endregion
}
