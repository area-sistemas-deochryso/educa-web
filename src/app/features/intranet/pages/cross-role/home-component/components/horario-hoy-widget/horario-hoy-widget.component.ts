// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, Observable } from 'rxjs';
import { logger } from '@core/helpers';
import { ThemeService } from '@core/services/theme';
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
	imports: [RouterLink, SkeletonLoaderComponent],
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
	private theme = inject(ThemeService);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	private readonly horarios = signal<HorarioProfesorDto[]>([]);
	// #endregion

	// #region Computed
	readonly bloquesHoy = computed<HorarioBlock[]>(() => {
		const hoy = todayDia(new Date());
		return buildBlocks(this.horarios(), new Map(), this.theme.isDarkMode())
			.filter((b) => b.dia === hoy)
			.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
	});
	readonly isProfesor = computed(() => this.userProfile.isProfesor());
	readonly hasBloques = computed(() => this.bloquesHoy().length > 0);
	// #endregion

	// #region Helpers
	/** Hub del curso/salón del bloque; solo profesor, y `null` si falta `cursoId` o `salonId`. */
	hubLink(bloque: HorarioBlock): string[] | null {
		if (!this.isProfesor() || !bloque.cursoId || !bloque.salonId) return null;
		return ['/intranet/profesor/cursos', String(bloque.cursoId), String(bloque.salonId)];
	}
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
				this.horarios.set(horarios);
				this.loading.set(false);
			});
	}
	// #endregion
}
// #endregion
