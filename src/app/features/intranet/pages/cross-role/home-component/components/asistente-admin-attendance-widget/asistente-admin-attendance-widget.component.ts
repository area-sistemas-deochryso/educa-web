import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { AsistenciaAsistenteAdminApiService } from '@shared/services/attendance';
import { AsistenciaDetalle, AttendanceStatus } from '@data/models/attendance.models';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

/**
 * Widget de inicio para el Asistente Administrativo (Plan 28 Chat 4a).
 *
 * Variante simplificada del `ProfesorAttendanceWidgetComponent`: el AA no tiene
 * salón asignado, así que el widget solo muestra "Mi asistencia" del día.
 * El AA viendo `/intranet/asistencia` ve la vista mensual completa propia.
 *
 * Las correcciones formales sobre 'A' las hacen los supervisores
 * (Director, Promotor, Coordinador Académico) — INV-AD08.
 */
@Component({
	selector: 'app-asistente-admin-attendance-widget',
	standalone: true,
	imports: [RouterLink, SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './asistente-admin-attendance-widget.component.html',
	styleUrl: './asistente-admin-attendance-widget.component.scss',
})
export class AsistenteAdminAttendanceWidgetComponent implements OnInit {
	private api = inject(AsistenciaAsistenteAdminApiService);
	private destroyRef = inject(DestroyRef);

	readonly loading = signal(true);
	readonly miAsistencia = signal<AsistenciaDetalle | null>(null);

	readonly miEstadoCodigo = computed<AttendanceStatus | null>(
		() => this.miAsistencia()?.estadoCodigo ?? null,
	);

	readonly miEstadoLabel = computed(() => {
		switch (this.miEstadoCodigo()) {
			case 'A':
				return 'Asistió';
			case 'T':
				return 'Tardanza';
			case 'F':
				return 'Falta';
			case 'J':
				return 'Justificado';
			case '-':
				return 'Pendiente';
			case 'X':
				return 'Sin registro';
			default:
				return 'Sin registro';
		}
	});

	readonly miEstadoClass = computed(() => {
		switch (this.miEstadoCodigo()) {
			case 'A':
				return 'estado-asistio';
			case 'T':
				return 'estado-tardanza';
			case 'F':
				return 'estado-falta';
			case 'J':
				return 'estado-justificado';
			default:
				return 'estado-pendiente';
		}
	});

	ngOnInit(): void {
		const hoy = new Date();
		this.api
			.obtenerMiAsistenciaDia(hoy)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (resp) => {
					this.miAsistencia.set(resp?.asistencias?.[0] ?? null);
					this.loading.set(false);
				},
				error: () => this.loading.set(false),
			});
	}
}
