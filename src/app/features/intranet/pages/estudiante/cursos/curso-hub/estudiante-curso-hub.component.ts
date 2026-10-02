import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
	CURSO_HUB_SHELL_IMPORTS,
	CURSO_HUB_SHELL_TEMPLATE,
	CursoHubShellBase,
} from '@intranet-shared/components';
import type { CursoHubRol } from '@intranet-shared/helpers';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';

/**
 * Hub de curso del estudiante: `estudiante/cursos/:cursoId/:salonId?horarioId=`.
 * La resolución de par y franja vive en `CursoHubShellBase`; acá solo se
 * conecta la fuente de horarios del rol.
 */
@Component({
	selector: 'app-estudiante-curso-hub',
	standalone: true,
	imports: CURSO_HUB_SHELL_IMPORTS,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: CURSO_HUB_SHELL_TEMPLATE,
})
export class EstudianteCursoHubComponent extends CursoHubShellBase {
	private readonly facade = inject(EstudianteCursosFacade);

	protected readonly rol: CursoHubRol = 'estudiante';
	protected readonly horarios = computed(() => this.facade.vm().horarios);
	protected readonly loading = computed(() => this.facade.vm().loading);
	protected readonly loadError = computed(() => this.facade.vm().error);

	protected loadHorarios(): void {
		this.facade.loadHorarios();
	}

	protected probeContenido(horarioId: number) {
		return this.facade.getContenido(horarioId);
	}
}
