import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, untracked } from '@angular/core';
import { EduConfirmationService } from '@edu-ui';
import {
	CURSO_HUB_SHELL_IMPORTS,
	CURSO_HUB_SHELL_TEMPLATE,
	CursoHubShellBase,
} from '@intranet-shared/components';
import type { CursoHubRol } from '@intranet-shared/helpers';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';

/**
 * Hub de curso del estudiante: `estudiante/cursos/:cursoId/:salonId?horarioId=`.
 * La resolución de par y franja vive en `CursoHubShellBase`; acá se conecta la
 * fuente de horarios del rol y se es **dueño de la carga y del reset** del
 * contenido y las notas: las pestañas solo leen el store. Cargar desde el shell
 * hace que un deep link a cualquier pestaña tenga datos, y resetear al
 * destruirse (no al cambiar de pestaña) conserva el estado entre pestañas.
 */
@Component({
	selector: 'app-estudiante-curso-hub',
	standalone: true,
	imports: CURSO_HUB_SHELL_IMPORTS,
	providers: [EduConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: CURSO_HUB_SHELL_TEMPLATE,
})
export class EstudianteCursoHubComponent extends CursoHubShellBase {
	private readonly facade = inject(EstudianteCursosFacade);

	protected readonly rol: CursoHubRol = 'estudiante';
	protected readonly horarios = computed(() => this.facade.vm().horarios);
	protected readonly loading = computed(() => this.facade.vm().loading);
	protected readonly loadError = computed(() => this.facade.vm().error);

	constructor() {
		super();

		// La carga se repite solo si cambia el id de la franja (el objeto se re-crea al refrescar horarios).
		const slotId = computed(() => this.slot()?.id ?? null);
		effect(() => {
			const id = slotId();
			if (id === null) return;
			untracked(() => this.facade.loadContenidoForHub(id));
		});

		// Salir del hub: no dejar contenido ni notas de otra franja en el store compartido con el modal.
		inject(DestroyRef).onDestroy(() => this.facade.resetForHub());
	}

	protected loadHorarios(): void {
		this.facade.loadHorarios();
	}

	protected probeContenido(horarioId: number) {
		return this.facade.getContenido(horarioId);
	}
}
