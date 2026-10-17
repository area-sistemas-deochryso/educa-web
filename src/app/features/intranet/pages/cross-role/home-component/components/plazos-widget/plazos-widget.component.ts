// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { logger } from '@core/helpers';
import { UserProfileService } from '@core/services/user';
import { ProfesorCursosApiService } from '@features/intranet/pages/profesor/services';
import { SkeletonLoaderComponent } from '@shared/components';
import { CursoChipComponent } from '@intranet-shared/components';
import { TareasPendientesService } from '@intranet-shared/services';

// #endregion
// #region Types
type PlazoUrgencia = 'urgent' | 'soon' | 'normal';

interface PlazoItem {
	key: string;
	titulo: string;
	cursoId: number | null;
	/** Solo profesor; junto con `cursoId` define si el ítem es navegable. */
	salonId: number | null;
	horarioId: number | null;
	/** Solo profesor: evaluación a ubicar en la pestaña Calificaciones (`evaluacionId`). */
	calificacionId: number | null;
	cursoNombre: string;
	/** Fecha límite (estudiante) o de evaluación (profesor); `null` si la tarea no tiene fecha. */
	fecha: string | null;
	diasRestantes: number | null;
	/** Solo profesor: estudiantes matriculados sin nota. */
	sinNota: number | null;
	esNueva: boolean;
}

const MAX_ITEMS = 5;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
// #endregion

// #region Implementation
/**
 * Tarjeta de pendientes del Inicio (P110-F14): el estudiante ve sus tareas sin entregar
 * (con fecha límite y marca de "Nueva") y el profesor sus evaluaciones con alumnos sin nota.
 */
@Component({
	selector: 'app-plazos-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent, CursoChipComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './plazos-widget.component.html',
	styleUrl: './plazos-widget.component.scss',
})
export class PlazosWidgetComponent implements OnInit {
	// #region Dependencias
	private readonly tareasPendientes = inject(TareasPendientesService);
	private readonly profesorApi = inject(ProfesorCursosApiService);
	private readonly userProfile = inject(UserProfileService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly isProfesor = computed(() => this.userProfile.isProfesor());

	private readonly profesorLoading = signal(true);
	private readonly profesorItems = signal<PlazoItem[]>([]);

	readonly loading = computed(() => (this.isProfesor() ? this.profesorLoading() : !this.tareasPendientes.loaded()));

	private readonly allItems = computed<PlazoItem[]>(() =>
		this.isProfesor()
			? this.profesorItems()
			: this.tareasPendientes.tareas().map((t) =>
					this.toItem(`tarea-${t.tareaId}`, t.titulo, t.cursoId ?? null, t.cursoNombre, t.fechaLimite ?? null, null, t.esNueva),
				),
	);

	readonly items = computed(() => this.allItems().slice(0, MAX_ITEMS));
	readonly hiddenCount = computed(() => Math.max(0, this.allItems().length - MAX_ITEMS));

	/** Query del link: franja + evaluación a ubicar (solo ítems de profesor con evaluación). */
	gradesQuery(item: PlazoItem): Record<string, number> {
		const query: Record<string, number> = { horarioId: item.horarioId as number };
		if (item.calificacionId !== null) query['evaluacionId'] = item.calificacionId;
		return query;
	}

	/** Link a Calificaciones del curso/salón; `null` si falta `cursoId` o `salonId` (ítem no navegable). */
	gradesLink(item: PlazoItem): string[] | null {
		if (!this.isProfesor() || !item.cursoId || !item.salonId) return null;
		return ['/intranet/profesor/cursos', String(item.cursoId), String(item.salonId), 'calificaciones'];
	}

	readonly title = computed(() => (this.isProfesor() ? 'Calificaciones pendientes' : 'Tareas pendientes'));
	readonly icon = computed(() => (this.isProfesor() ? 'pi pi-pencil' : 'pi pi-clock'));
	readonly detailRoute = computed(() =>
		this.isProfesor() ? '/intranet/profesor/cursos' : '/intranet/estudiante/cursos',
	);
	// #endregion

	// #region Helpers de presentación
	urgencia(item: PlazoItem): PlazoUrgencia {
		if (item.diasRestantes === null) return 'normal';
		if (item.diasRestantes <= 0) return 'urgent';
		if (item.diasRestantes <= 3) return 'soon';
		return 'normal';
	}

	label(item: PlazoItem): string {
		if (this.isProfesor()) return item.sinNota === 1 ? '1 sin nota' : `${item.sinNota ?? 0} sin nota`;
		if (item.diasRestantes === null) return 'Sin fecha límite';
		if (item.diasRestantes < 0) return 'Vencida';
		if (item.diasRestantes === 0) return 'Vence hoy';
		if (item.diasRestantes === 1) return 'Vence mañana';
		return `Vence en ${item.diasRestantes} días`;
	}
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		if (!this.userProfile.isProfesor()) {
			this.tareasPendientes.refresh();
			return;
		}
		this.profesorApi
			.getCalificacionesPendientes()
			.pipe(
				catchError((err: { status?: number }) => {
					logger.warn('[PlazosWidget] getCalificacionesPendientes failed — fallback empty', err?.status);
					return of([]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((evaluaciones) => {
				this.profesorItems.set(
					evaluaciones.map((e) =>
						this.toItem(`calificacion-${e.calificacionId}`, e.titulo, e.cursoId ?? null, e.cursoNombre, e.fechaEvaluacion, e.sinNota, false, e.salonId ?? null, e.horarioId, e.calificacionId),
					),
				);
				this.profesorLoading.set(false);
			});
	}

	private toItem(
		key: string,
		titulo: string,
		cursoId: number | null,
		cursoNombre: string,
		fecha: string | null,
		sinNota: number | null,
		esNueva: boolean,
		salonId: number | null = null,
		horarioId: number | null = null,
		calificacionId: number | null = null,
	): PlazoItem {
		return { key, titulo, cursoId, salonId, horarioId, calificacionId, cursoNombre, fecha, diasRestantes: this.diffDays(fecha), sinNota, esNueva };
	}

	private diffDays(fecha: string | null): number | null {
		if (!fecha) return null;
		const target = new Date(fecha);
		if (isNaN(target.getTime())) return null;
		const today = new Date();
		const a = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
		const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
		return Math.round((a - b) / MS_PER_DAY);
	}
	// #endregion
}
// #endregion
