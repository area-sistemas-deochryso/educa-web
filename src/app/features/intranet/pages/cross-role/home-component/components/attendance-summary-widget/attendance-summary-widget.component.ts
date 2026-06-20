import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	DestroyRef,
	signal,
	computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DirectorAttendanceApiService } from '@intranet-shared/services';
import { EstadisticasRol, TipoPersona } from '@data/models';
import { SkeletonLoaderComponent } from '@shared/components';

interface RolDisplay {
	tipoPersona: TipoPersona;
	label: string;
	stats: EstadisticasRol;
	bars: { label: string; value: number; class: string }[];
}

const ROL_LABELS: Record<string, string> = {
	E: 'Estudiantes',
	P: 'Profesores',
	A: 'Asistentes Admin',
	C: 'Coordinadores',
	M: 'Promotores',
	D: 'Directores',
};

const ROL_ORDER: TipoPersona[] = ['E', 'P', 'A', 'C', 'M', 'D'];

const ROL_VISIBLE: Record<TipoPersona, boolean> = {
	E: true,
	P: true,
	A: true,
	C: true,
	M: false,
	D: false,
	N: false,
};

@Component({
	selector: 'app-attendance-summary-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './attendance-summary-widget.component.html',
	styleUrl: './attendance-summary-widget.component.scss',
})
export class AttendanceSummaryWidgetComponent implements OnInit {
	// #region Dependencias
	private directorApi = inject(DirectorAttendanceApiService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	readonly loading = signal(true);
	readonly roles = signal<RolDisplay[]>([]);
	// #endregion

	// #region Helpers
	presentes(stats: EstadisticasRol): number {
		return stats.conEntrada;
	}

	percentageClass(porcentaje: number): string {
		if (porcentaje >= 85) return 'high';
		if (porcentaje >= 60) return 'medium';
		return 'low';
	}

	barPercent(value: number, total: number): number {
		return total > 0 ? (value / total) * 100 : 0;
	}
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.directorApi
			.getEstadisticasMultiRol(undefined, false)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					if (data) {
						const sorted = [...data.roles].sort(
							(a, b) =>
								ROL_ORDER.indexOf(a.tipoPersona) - ROL_ORDER.indexOf(b.tipoPersona),
						);
						this.roles.set(
							sorted
								.filter((r) => r.total > 0 && ROL_VISIBLE[r.tipoPersona])
								.map((r) => this.toRolDisplay(r)),
						);
					}
					this.loading.set(false);
				},
				error: () => this.loading.set(false),
			});
	}
	// #endregion

	// #region Privado
	private toRolDisplay(r: EstadisticasRol): RolDisplay {
		const asistio = r.conEntrada - r.tardanza;

		return {
			tipoPersona: r.tipoPersona,
			label: ROL_LABELS[r.tipoPersona] ?? r.tipoPersona,
			stats: r,
			bars: [
				{ label: 'Asistió', value: asistio, class: 'bar-asistio' },
				{ label: 'Tardanza', value: r.tardanza, class: 'bar-tardanza' },
				{ label: 'Falta', value: r.faltas, class: 'bar-faltas' },
			],
		};
	}
	// #endregion
}
