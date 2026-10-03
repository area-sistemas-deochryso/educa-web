import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UserPermissionsService } from '@core/services/permissions';
import {
	CursoHubContextService,
	CursoHubSalonSummaryComponent,
	EmptyStateComponent,
} from '@intranet-shared/components';
import {
	buildCursoHubSalonSummary,
	buildSalonesPageTarget,
	isSameCursoHubSalonSummary,
} from '@intranet-shared/helpers';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';

/**
 * Pestaña Salón del hub de curso del estudiante (`…/salon`): resumen del salón
 * del par y enlace a Mis Salones. Es del par, no de la franja: el resumen se
 * deriva del salón y se compara por valor, así que cambiar de franja no lo
 * re-emite. No pide datos: usa los horarios que el shell ya cargó.
 */
@Component({
	selector: 'app-estudiante-curso-hub-salon',
	standalone: true,
	imports: [CursoHubSalonSummaryComponent, EmptyStateComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (summary(); as resumen) {
			<app-curso-hub-salon-summary
				rol="estudiante"
				[summary]="resumen"
				[currentCursoId]="cursoId()"
				[salonesTarget]="salonesTarget()"
			/>
		} @else {
			<app-empty-state
				icon="pi pi-building"
				title="Salón"
				message="No se encontró información de este salón para tu usuario."
			/>
		}
	`,
})
export class EstudianteCursoHubSalonComponent {
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly facade = inject(EstudianteCursosFacade);
	private readonly userPermisos = inject(UserPermissionsService);
	// #endregion

	// #region Estado
	/** El par (curso, salón) de la franja resuelta; se compara por valor para ignorar el cambio de franja. */
	private readonly pair = computed(
		() => {
			const slot = this.hubContext.slot();
			return slot ? { cursoId: slot.cursoId, salonId: slot.salonId } : null;
		},
		{ equal: (a, b) => a?.cursoId === b?.cursoId && a?.salonId === b?.salonId },
	);

	protected readonly cursoId = computed(() => this.pair()?.cursoId ?? 0);

	protected readonly summary = computed(
		() => {
			const pair = this.pair();
			return pair ? buildCursoHubSalonSummary(this.facade.vm().horarios, pair.salonId) : null;
		},
		{ equal: isSameCursoHubSalonSummary },
	);

	/** Sin la capability de Salones se oculta el enlace (no se muestra deshabilitado: no hay nada que el usuario pueda hacer). */
	protected readonly salonesTarget = computed(() => {
		const slot = this.hubContext.slot();
		if (!slot || !this.userPermisos.hasCapability('SALONES_ESTUDIANTE_PAGE_VIEW')) return null;
		return buildSalonesPageTarget('estudiante', slot.id);
	});
	// #endregion
}
