import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, untracked } from '@angular/core';
import { EduConfirmationService } from '@edu-ui';
import {
	CURSO_HUB_SHELL_IMPORTS,
	CURSO_HUB_SHELL_TEMPLATE,
	CursoHubShellBase,
} from '@intranet-shared/components';
import type { CursoHubRol } from '@intranet-shared/helpers';
import { UnsavedChangesPromptService } from '@intranet-shared/services';
import { ProfesorFacade } from '../../services/profesor.facade';
import { AttendanceCourseFacade } from '../services/attendance-course.facade';
import { CursoContenidoDataFacade } from '../services/curso-contenido-data.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';

/**
 * Hub de curso del profesor: `profesor/cursos/:cursoId/:salonId?horarioId=`.
 * La resolución de par y franja vive en `CursoHubShellBase`; acá se conecta la
 * fuente de horarios del rol y se es **dueño de la carga y del reset** del
 * contenido y las calificaciones: las pestañas solo leen los stores. Cargar
 * desde el shell hace que un deep link a cualquier pestaña tenga datos, y
 * resetear al destruirse (no al cambiar de pestaña) conserva el estado entre
 * pestañas.
 */
@Component({
	selector: 'app-profesor-curso-hub',
	standalone: true,
	imports: CURSO_HUB_SHELL_IMPORTS,
	providers: [EduConfirmationService, UnsavedChangesPromptService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: CURSO_HUB_SHELL_TEMPLATE,
})
export class ProfesorCursoHubComponent extends CursoHubShellBase {
	private readonly facade = inject(ProfesorFacade);
	private readonly dataFacade = inject(CursoContenidoDataFacade);
	private readonly calLoader = inject(CursoHubCalificacionesLoader);
	private readonly asistenciaFacade = inject(AttendanceCourseFacade);

	protected readonly rol: CursoHubRol = 'profesor';
	protected readonly horarios = computed(() => this.facade.vm().horarios);
	protected readonly loading = computed(() => this.facade.vm().loading);
	protected readonly loadError = computed(() => this.facade.vm().error);

	constructor() {
		super();

		// La carga arranca con la franja ya resuelta (no bloquea el primer pintado del encabezado)
		// y se repite solo si cambia el id de la franja (el objeto se re-crea al refrescar horarios).
		const slotId = computed(() => this.slot()?.id ?? null);
		effect(() => {
			const id = slotId();
			if (id === null) return;
			const salonId = untracked(() => this.slot()?.salonId);
			untracked(() => {
				this.calLoader.reset();
				this.dataFacade.loadContenidoForHub(id, { salonId });
			});
		});

		// Salir del hub: no dejar contenido ni calificaciones de otra franja en los stores compartidos con el modal.
		inject(DestroyRef).onDestroy(() => {
			this.calLoader.reset();
			this.dataFacade.resetForHub();
			this.asistenciaFacade.resetAsistencia();
		});
	}

	protected override hasUnsavedChanges(): boolean {
		const vm = this.asistenciaFacade.vm();
		return vm.registroDirty && vm.registroData?.horarioId === this.slot()?.id;
	}

	protected override unsavedChangesMessage(): string {
		return 'Tienes cambios de asistencia sin guardar.';
	}

	protected override canSaveUnsaved(): boolean {
		return this.asistenciaFacade.canSaveOutsidePanel(this.slot()?.diaSemana ?? null);
	}

	protected override saveUnsaved(): Promise<boolean> {
		const horarioId = this.slot()?.id;
		return horarioId === undefined ? Promise.resolve(false) : this.asistenciaFacade.registrar(horarioId);
	}

	protected loadHorarios(): void {
		this.facade.loadData();
	}

	protected probeContenido(horarioId: number) {
		return this.facade.getContenido(horarioId);
	}
}
