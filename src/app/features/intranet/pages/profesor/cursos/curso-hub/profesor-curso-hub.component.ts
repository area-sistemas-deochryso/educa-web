import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
	CURSO_HUB_SHELL_IMPORTS,
	CURSO_HUB_SHELL_TEMPLATE,
	CursoHubShellBase,
} from '@intranet-shared/components';
import type { CursoHubRol } from '@intranet-shared/helpers';
import { ProfesorFacade } from '../../services/profesor.facade';

/**
 * Hub de curso del profesor: `profesor/cursos/:cursoId/:salonId?horarioId=`.
 * La resolución de par y franja vive en `CursoHubShellBase`; acá solo se
 * conecta la fuente de horarios del rol.
 */
@Component({
	selector: 'app-profesor-curso-hub',
	standalone: true,
	imports: CURSO_HUB_SHELL_IMPORTS,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: CURSO_HUB_SHELL_TEMPLATE,
})
export class ProfesorCursoHubComponent extends CursoHubShellBase {
	private readonly facade = inject(ProfesorFacade);

	protected readonly rol: CursoHubRol = 'profesor';
	protected readonly horarios = computed(() => this.facade.vm().horarios);
	protected readonly loading = computed(() => this.facade.vm().loading);
	protected readonly loadError = computed(() => this.facade.vm().error);

	protected loadHorarios(): void {
		this.facade.loadData();
	}

	protected probeContenido(horarioId: number) {
		return this.facade.getContenido(horarioId);
	}
}
