// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { logger } from '@core/helpers';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import { HorarioProfesorDto, EstudianteMisNotasDto } from '@features/intranet/pages/estudiante/models/estudiante.models';
import { buildBlocks, getNextOccurrence, HorarioBlock } from '@intranet-shared/helpers';
import { SkeletonLoaderComponent } from '@shared/components';

// #endregion
// #region Types
interface ProximaClase {
	block: HorarioBlock;
	fecha: Date;
}

interface UltimaCalificacion {
	cursoNombre: string;
	titulo: string;
	nota: number;
	fechaEvaluacion: string;
}
// #endregion

// #region Implementation
@Component({
	selector: 'app-estudiante-resumen-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-resumen-widget.component.html',
	styleUrl: './estudiante-resumen-widget.component.scss',
})
export class EstudianteResumenWidgetComponent implements OnInit {
	// #region Dependencias
	private estudianteApi = inject(EstudianteApiService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly proximaClase = signal<ProximaClase | null>(null);
	readonly ultimaCalificacion = signal<UltimaCalificacion | null>(null);
	// #endregion

	// #region Computed — Próxima clase
	readonly proximaClaseLabel = computed(() => {
		const p = this.proximaClase();
		if (!p) return '';
		const now = new Date();
		const horaLabel = p.block.horaInicio;

		if (this.isSameDate(p.fecha, now)) return `Hoy ${horaLabel}`;

		const manana = new Date(now);
		manana.setDate(manana.getDate() + 1);
		if (this.isSameDate(p.fecha, manana)) return `Mañana ${horaLabel}`;

		const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
		return `${dias[p.fecha.getDay()]} ${horaLabel}`;
	});
	// #endregion

	// #region Helpers
	private isSameDate(a: Date, b: Date): boolean {
		return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
	}
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const horarios$ = this.estudianteApi.getMisHorarios().pipe(
			catchError((err) => {
				logger.warn('[EstudianteResumenWidget] getMisHorarios failed — fallback empty', err?.status);
				return of([] as HorarioProfesorDto[]);
			}),
		);
		const notas$ = this.estudianteApi.getMisNotas().pipe(
			catchError((err) => {
				logger.warn('[EstudianteResumenWidget] getMisNotas failed — fallback empty', err?.status);
				return of([] as EstudianteMisNotasDto[]);
			}),
		);

		forkJoin({ horarios: horarios$, notas: notas$ })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ horarios, notas }) => {
				this.proximaClase.set(this.resolveProximaClase(horarios));
				this.ultimaCalificacion.set(this.resolveUltimaCalificacion(notas));
				this.loading.set(false);
			});
	}

	private resolveProximaClase(horarios: HorarioProfesorDto[]): ProximaClase | null {
		const now = new Date();
		const blocks = buildBlocks(horarios, new Map());
		if (blocks.length === 0) return null;

		let best: ProximaClase | null = null;
		for (const block of blocks) {
			const fecha = getNextOccurrence(block, now);
			if (!best || fecha.getTime() < best.fecha.getTime()) {
				best = { block, fecha };
			}
		}
		return best;
	}

	private resolveUltimaCalificacion(notas: EstudianteMisNotasDto[]): UltimaCalificacion | null {
		const calificadas = notas
			.flatMap((n) => n.evaluaciones.map((e) => ({ ...e, cursoNombre: n.cursoNombre })))
			.filter((e) => e.nota !== null);

		if (calificadas.length === 0) return null;

		calificadas.sort((a, b) => b.fechaEvaluacion.localeCompare(a.fechaEvaluacion));
		const ultima = calificadas[0];
		return {
			cursoNombre: ultima.cursoNombre,
			titulo: ultima.titulo,
			nota: ultima.nota as number,
			fechaEvaluacion: ultima.fechaEvaluacion,
		};
	}
	// #endregion
}
// #endregion
