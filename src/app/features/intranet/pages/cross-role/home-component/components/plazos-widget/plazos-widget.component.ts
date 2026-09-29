// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { logger } from '@core/helpers';
import { UserProfileService } from '@core/services/user';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import { ProfesorCursosApiService } from '@features/intranet/pages/profesor/services';
import { SkeletonLoaderComponent } from '@shared/components';

// #endregion
// #region Types
type PlazoUrgencia = 'urgent' | 'soon' | 'normal';

interface PlazoItem {
	key: string;
	titulo: string;
	cursoNombre: string;
	fecha: string;
	diasRestantes: number;
}

const MAX_ITEMS = 3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
// #endregion

// #region Implementation
@Component({
	selector: 'app-plazos-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './plazos-widget.component.html',
	styleUrl: './plazos-widget.component.scss',
})
export class PlazosWidgetComponent implements OnInit {
	// #region Dependencias
	private readonly estudianteApi = inject(EstudianteApiService);
	private readonly profesorApi = inject(ProfesorCursosApiService);
	private readonly userProfile = inject(UserProfileService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	private readonly allItems = signal<PlazoItem[]>([]);

	readonly items = computed(() => this.allItems().slice(0, MAX_ITEMS));
	readonly hiddenCount = computed(() => Math.max(0, this.allItems().length - MAX_ITEMS));
	readonly isProfesor = computed(() => this.userProfile.isProfesor());

	readonly title = computed(() => (this.isProfesor() ? 'Calificaciones por cerrar' : 'Tareas por vencer'));
	readonly icon = computed(() => (this.isProfesor() ? 'pi pi-lock' : 'pi pi-clock'));
	readonly detailRoute = computed(() =>
		this.isProfesor() ? '/intranet/profesor/cursos' : '/intranet/estudiante/cursos',
	);
	// #endregion

	// #region Helpers de presentación
	urgencia(item: PlazoItem): PlazoUrgencia {
		if (item.diasRestantes <= 0) return 'urgent';
		if (item.diasRestantes <= 3) return 'soon';
		return 'normal';
	}

	label(item: PlazoItem): string {
		const verbo = this.isProfesor() ? 'Se congela' : 'Vence';
		if (item.diasRestantes <= 0) return `${verbo} hoy`;
		if (item.diasRestantes === 1) return `${verbo} mañana`;
		return `${verbo} en ${item.diasRestantes} días`;
	}
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const source$ = this.userProfile.isProfesor() ? this.loadProfesor() : this.loadEstudiante();
		source$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
			this.allItems.set(items);
			this.loading.set(false);
		});
	}

	private loadEstudiante(): Observable<PlazoItem[]> {
		return this.estudianteApi.getMisTareasPorVencer().pipe(
			map((tareas) =>
				this.sortByFecha(
					tareas.map((t) => this.toItem(`tarea-${t.tareaId}`, t.titulo, t.cursoNombre, t.fechaLimite)),
				),
			),
			catchError((err) => this.fallback('getMisTareasPorVencer', err)),
		);
	}

	private loadProfesor(): Observable<PlazoItem[]> {
		return this.profesorApi.getEvaluacionesPorCongelarse().pipe(
			map((evaluaciones) =>
				this.sortByFecha(
					evaluaciones.map((e) =>
						this.toItem(`evaluacion-${e.evaluacionId}`, e.titulo, e.cursoNombre, e.fechaLimiteEdicion),
					),
				),
			),
			catchError((err) => this.fallback('getEvaluacionesPorCongelarse', err)),
		);
	}

	private fallback(op: string, err: { status?: number }): Observable<PlazoItem[]> {
		logger.warn(`[PlazosWidget] ${op} failed — fallback empty`, err?.status);
		return of([]);
	}

	private toItem(key: string, titulo: string, cursoNombre: string, fecha: string): PlazoItem {
		return { key, titulo, cursoNombre, fecha, diasRestantes: this.diffDays(fecha) };
	}

	private sortByFecha(items: PlazoItem[]): PlazoItem[] {
		return [...items].sort((a, b) => a.fecha.localeCompare(b.fecha));
	}

	private diffDays(fecha: string): number {
		const target = new Date(fecha);
		if (isNaN(target.getTime())) return Number.MAX_SAFE_INTEGER;
		const today = new Date();
		const a = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
		const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
		return Math.round((a - b) / MS_PER_DAY);
	}
	// #endregion
}
// #endregion
