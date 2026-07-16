import { Component, ChangeDetectionStrategy, inject, effect, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent, PeriodToggleComponent } from '@intranet-shared/components';
import { PluralizePipe } from '@intranet-shared/pipes';
import { SalonCursoInfo, VistaPromedio, ActualizarGrupoDto, ProfesorSalonConEstudiantes } from '../models';
import { ProfesorFacade } from '../services/profesor.facade';
import { GruposFacade } from './services/grupos.facade';
import { HealthPermissionsFacade } from './services/health-permissions.facade';
import { CreateHealthExitRequest } from '../models';
import { SalonMensajeriaFacade } from '@features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade';
import { SalonEstudiantesDialogComponent } from './components/salon-estudiantes-dialog/salon-estudiantes-dialog.component';
import { NotaSaveEvent } from './components/salon-notas-estudiante-tab/salon-notas-estudiante-tab.component';

@Component({
	selector: 'app-teacher-classrooms',
	standalone: true,
	imports: [
		CommonModule,
		TagModule,
		TooltipModule,
		ProgressSpinnerModule,
		PageHeaderComponent,
		PeriodToggleComponent,
		PluralizePipe,
		SalonEstudiantesDialogComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './profesor-salones.component.html',
	styleUrl: './profesor-salones.component.scss',
})
export class TeacherClassroomsComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	readonly gruposFacade = inject(GruposFacade);
	private readonly mensajeriaFacade = inject(SalonMensajeriaFacade);
	readonly healthFacade = inject(HealthPermissionsFacade);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly gruposVm = this.gruposFacade.vm;
	readonly healthVm = this.healthFacade.vm;
	gruposCursoId: number | null = null;
	// #endregion

	// #region Deep-link desde vista de curso
	private readonly pendingHorarioId = signal<number | null>(null);

	constructor() {
		const qpHorarioId = Number(this.route.snapshot.queryParamMap.get('horarioId'));
		if (qpHorarioId > 0) this.pendingHorarioId.set(qpHorarioId);

		effect(() => {
			const pending = this.pendingHorarioId();
			const horarios = this.vm().horarios;
			const salones = this.vm().salonesConEstudiantes;
			if (!pending || horarios.length === 0 || salones.length === 0) return;

			const horario = horarios.find((h) => h.id === pending);
			const salon = horario ? salones.find((s) => s.salonId === horario.salonId) : undefined;
			this.pendingHorarioId.set(null);
			if (salon) this.openSalonDialog(salon);
		});
	}
	// #endregion

	ngOnInit(): void {
		this.facade.loadData();
	}

	// #region Period filter
	onPeriodoChange(esVerano: boolean): void {
		this.facade.setEsVerano(esVerano);
	}
	// #endregion

	// #region Salon table handlers
	onVerCursoContenido(curso: SalonCursoInfo): void {
		this.router.navigate(['/intranet/profesor/cursos'], {
			queryParams: { horarioId: curso.horarioId },
		});
	}

	openSalonDialog(salon: ProfesorSalonConEstudiantes): void {
		this.facade.openSalonDialog(salon);
		this.gruposCursoId = null;
		this.gruposFacade.resetGrupos();
		// "Grupos" es la tab inicial del modal — (gruposTabActivated) del tab-view solo
		// emite en cambio de tab, nunca en el render inicial de la tab ya activa. Ver brief 418 F6.
		this.onGruposTabActivated();
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeSalonDialog();
			this.gruposFacade.resetGrupos();
			this.mensajeriaFacade.reset();
			this.gruposCursoId = null;
		}
	}
	// #endregion

	// #region Notas handlers
	onNotasTabActivated(): void {
		const salon = this.vm().selectedSalon;
		const cursos = this.vm().cursosForSelectedSalon;
		if (!salon || cursos.length === 0) return;

		if (!this.vm().notasCursoId) {
			this.facade.loadNotasSalon(salon.salonId, cursos[0].value);
		}
	}

	onNotasCursoChange(cursoId: number): void {
		const salon = this.vm().selectedSalon;
		if (!salon) return;
		this.facade.loadNotasSalon(salon.salonId, cursoId);
	}

	onNotasVistaChange(vista: VistaPromedio): void {
		this.facade.setNotasVista(vista);
	}

	onNotaSave(event: NotaSaveEvent): void {
		this.facade.saveNotaSalon(event.calificacionId, event.estudianteId, event.nota);
	}
	// #endregion

	// #region Grupos handlers
	onGruposTabActivated(): void {
		const salon = this.vm().selectedSalon;
		const cursos = this.vm().cursosForSelectedSalon;
		if (!salon || cursos.length === 0) return;

		if (!this.gruposCursoId) {
			this.gruposCursoId = cursos[0].value;
			const horarioId = this.resolveHorarioId(salon.salonId, cursos[0].value);
			if (horarioId) this.gruposFacade.loadGruposForHorario(horarioId);
		}
	}

	onGruposCursoChange(cursoId: number): void {
		const salon = this.vm().selectedSalon;
		if (!salon) return;
		this.gruposCursoId = cursoId;
		const horarioId = this.resolveHorarioId(salon.salonId, cursoId);
		if (horarioId) this.gruposFacade.loadGruposForHorario(horarioId);
	}

	onGruposCrearGrupo(nombre: string): void {
		this.gruposFacade.crearGrupo(nombre);
	}

	onGruposEliminarGrupo(grupoId: number): void {
		this.gruposFacade.eliminarGrupo(grupoId);
	}

	onGruposRenombrarGrupo(event: { grupoId: number; nombre: string }): void {
		const dto: ActualizarGrupoDto = { nombre: event.nombre };
		this.gruposFacade.actualizarGrupo(event.grupoId, dto);
	}

	onGruposAsignarEstudiantes(event: { grupoId: number; estudianteIds: number[] }): void {
		this.gruposFacade.asignarEstudiantes(event.grupoId, { estudianteIds: event.estudianteIds });
	}

	onGruposRemoverEstudiante(event: { grupoId: number; estudianteId: number }): void {
		this.gruposFacade.removerEstudiante(event.grupoId, event.estudianteId);
	}

	onGruposDropEstudiante(event: { estudianteId: number; fromGrupoId: number | null; toGrupoId: number | null }): void {
		this.gruposFacade.dropEstudiante(event);
	}

	onGruposOpenAsignar(grupoId: number): void {
		this.gruposFacade.openAsignarDialog(grupoId);
	}

	onGruposConfigurarMax(max: number | null): void {
		this.gruposFacade.configurarMaxEstudiantes(max);
	}

	onGruposRefresh(): void {
		const salon = this.vm().selectedSalon;
		if (!salon || !this.gruposCursoId) return;
		const horarioId = this.resolveHorarioId(salon.salonId, this.gruposCursoId);
		if (horarioId) this.gruposFacade.loadGruposForHorario(horarioId);
	}

	/** Resuelve horarioId desde salonId + cursoId usando los horarios del profesor. */
	private resolveHorarioId(salonId: number, cursoId: number): number | null {
		const horario = this.vm().horarios.find((h) => h.salonId === salonId && h.cursoId === cursoId);
		return horario?.id ?? null;
	}
	// #endregion

	// #region Refresh handlers
	onNotasRefresh(): void {
		const salon = this.vm().selectedSalon;
		const cursoId = this.vm().notasCursoId;
		if (!salon || !cursoId) return;
		this.facade.loadNotasSalon(salon.salonId, cursoId);
	}

	onDescargarBoletas(): void {
		const salon = this.vm().selectedSalon;
		if (!salon) return;
		this.facade.descargarBoletaSalon(salon.salonId, salon.salonDescripcion);
	}
	// #endregion

	// #region Health handlers
	onHealthTabActivated(): void {
		const salon = this.vm().selectedSalon;
		if (!salon) return;
		this.healthFacade.loadResumen(salon.salonId);
	}

	onHealthExitDialogVisibleChange(visible: boolean): void {
		if (!visible) this.healthFacade.closeExitDialog();
	}

	onHealthJustificationDialogVisibleChange(visible: boolean): void {
		if (!visible) this.healthFacade.closeJustificationDialog();
	}

	onHealthSaveExitPermission(event: { estudianteId: number; sintomas: string[]; sintomaDetalle?: string; observacion?: string }): void {
		const salon = this.vm().selectedSalon;
		if (!salon) return;
		const dto: CreateHealthExitRequest = { ...event, salonId: salon.salonId };
		this.healthFacade.crearPermisoSalida(dto);
	}

	onHealthSaveJustification(formData: FormData): void {
		this.healthFacade.crearJustificacion(formData);
	}

	onHealthConfirmDialogHide(): void {
		// No-op: confirmDialog cleanup handled by PrimeNG
	}
	// #endregion
}
