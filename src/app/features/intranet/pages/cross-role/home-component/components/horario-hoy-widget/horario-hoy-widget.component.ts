// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, Observable } from 'rxjs';
import { logger } from '@core/helpers';
import { UserProfileService } from '@core/services/user';
import { ProfesorApiService } from '@features/intranet/pages/profesor/services';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import { buildBlocks, todayDia, HorarioBlock } from '@intranet-shared/helpers';
import { SkeletonLoaderComponent } from '@shared/components';

// #endregion
// #region Implementation
@Component({
	selector: 'app-horario-hoy-widget',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './horario-hoy-widget.component.html',
	styleUrl: './horario-hoy-widget.component.scss',
})
export class HorarioHoyWidgetComponent implements OnInit {
	// #region Dependencias
	private userProfile = inject(UserProfileService);
	private profesorApi = inject(ProfesorApiService);
	private estudianteApi = inject(EstudianteApiService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly bloquesHoy = signal<HorarioBlock[]>([]);
	// #endregion

	// #region Computed
	readonly hasBloques = computed(() => this.bloquesHoy().length > 0);
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const horarios$: Observable<HorarioProfesorDto[]> = this.userProfile.isProfesor()
			? this.profesorApi.getHorarios(this.userProfile.entityId() ?? 0)
			: this.estudianteApi.getMisHorarios();

		horarios$
			.pipe(
				catchError((err) => {
					logger.warn('[HorarioHoyWidget] getHorarios failed — fallback empty', err?.status);
					return of([] as HorarioProfesorDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((horarios) => {
				const hoy = todayDia(new Date());
				const bloques = buildBlocks(horarios, new Map())
					.filter((b) => b.dia === hoy)
					.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
				this.bloquesHoy.set(bloques);
				this.loading.set(false);
			});
	}
	// #endregion
}
// #endregion
