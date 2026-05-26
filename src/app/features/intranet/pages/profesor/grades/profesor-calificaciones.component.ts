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
import { Select } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { PageHeaderComponent } from '@intranet-shared/components';
import { SkeletonLoaderComponent } from '@shared/components';
import { ProfesorFacade } from '../services/profesor.facade';
import { CalificacionesFacade } from '../cursos/services/calificaciones.facade';
import { CalificacionesPanelComponent } from '../cursos/components/calificaciones-panel/calificaciones-panel.component';
import { CalificarDialogComponent } from '../cursos/components/calificar-dialog/calificar-dialog.component';
import { EvaluacionFormDialogComponent } from '../cursos/components/evaluacion-form-dialog/evaluacion-form-dialog.component';
import { PeriodosConfigDialogComponent } from '../cursos/components/periodos-config-dialog/periodos-config-dialog.component';
import {
	CalificacionConNotasDto,
	CrearCalificacionDto,
	CalificarLoteDto,
	CalificarGruposLoteDto,
	CambiarTipoCalificacionDto,
	CursoContenidoDetalleDto,
} from '../models';

@Component({
	selector: 'app-teacher-grades',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		Select,
		ConfirmDialogModule,
		PageHeaderComponent,
		SkeletonLoaderComponent,
		CalificacionesPanelComponent,
		CalificarDialogComponent,
		EvaluacionFormDialogComponent,
		PeriodosConfigDialogComponent,
	],
	providers: [ConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './profesor-calificaciones.component.html',
	styleUrl: './profesor-calificaciones.component.scss',
})
export class TeacherGradesComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	readonly calFacade = inject(CalificacionesFacade);
	private readonly confirmationService = inject(ConfirmationService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado local
	selectedHorarioId = signal<number | null>(null);
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
	onCursoChange(horarioId: number): void {
		this.selectedHorarioId.set(horarioId);
		this.calFacade.resetCalificaciones();
		this._contenido.set(null);
		this._contenidoLoading.set(true);

		this.facade
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
					// Resolver salonId del horario y almacenarlo vía facade (necesario para roster)
					const horario = this.facade.vm().horarios.find((h) => h.id === horarioId);
					this.calFacade.setContenidoWithSalon(contenido, horario?.salonId ?? null);
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
