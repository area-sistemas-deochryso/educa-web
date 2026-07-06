import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

import { logger } from '@core/helpers';
import { EmailOutboxLista } from '@data/models';
import { UsersService } from '../users/services';
import { EmailOutboxDashboardDiaService } from '../email-outbox-dashboard-dia/services/email-outbox-dashboard-dia.service';
import { AttendanceGapRow } from '../email-outbox-dashboard-dia/models/email-dashboard-dia.models';

interface StudentIdentity {
	alumno: string;
	grado: string;
	salonNombre: string;
	correo: string | null;
}

@Component({
	selector: 'app-student-gap-profile',
	standalone: true,
	imports: [CommonModule, ButtonModule, TableModule, TagModule, SkeletonModule, RouterLink],
	templateUrl: './student-gap-profile.component.html',
	styleUrl: './student-gap-profile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentGapProfileComponent implements OnInit {
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private usersService = inject(UsersService);
	private dashboardService = inject(EmailOutboxDashboardDiaService);

	private params = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))));
	readonly estudianteId = computed(() => {
		const raw = this.params();
		return raw ? Number(raw) : null;
	});

	readonly identity = signal<StudentIdentity | null>(null);
	readonly gaps = signal<AttendanceGapRow[]>([]);
	readonly emails = signal<EmailOutboxLista[]>([]);
	readonly loading = signal(true);
	readonly notFound = signal(false);
	readonly error = signal<string | null>(null);

	ngOnInit(): void {
		const id = this.estudianteId();
		if (id == null) {
			this.goBack();
			return;
		}

		// Preview inmediato si venimos de un cross-link (evita flash de "Estudiante #id").
		// La fuente de verdad es la carga desde la API abajo, refresh-safe.
		const nav = this.router.getCurrentNavigation();
		const state = nav?.extras?.state as Partial<StudentIdentity> | undefined;
		if (state?.alumno) {
			this.identity.set({
				alumno: state.alumno,
				grado: state.grado ?? '',
				salonNombre: state.salonNombre ?? '',
				correo: null,
			});
		}

		this.loadData(id);
	}

	goBack(): void {
		this.router.navigate(['/intranet/admin/monitoreo/correos/dashboard']);
	}

	getEstadoSeverity(estado: string | null): 'danger' | 'warn' | 'success' | 'secondary' {
		switch (estado) {
			case 'FAILED':
				return 'danger';
			case 'PROCESSING':
			case 'PENDING':
				return 'warn';
			case 'SENT':
				return 'success';
			default:
				return 'secondary';
		}
	}

	private async loadData(id: number): Promise<void> {
		this.error.set(null);
		this.notFound.set(false);

		try {
			const [identity, gapRows, emailRows] = await Promise.all([
				firstValueFrom(this.usersService.obtenerUsuario('Estudiante', id)),
				firstValueFrom(this.dashboardService.obtenerAsistenciasSinCorreo(undefined, id)),
				firstValueFrom(this.dashboardService.listarPorEstudiante(id)),
			]);

			if (identity) {
				this.identity.set({
					alumno: identity.nombreCompleto,
					grado: identity.grado ?? '',
					salonNombre: identity.salonNombre ?? '',
					correo: identity.correo ?? null,
				});
			} else {
				this.notFound.set(true);
			}

			this.gaps.set(gapRows);
			this.emails.set(emailRows);
		} catch (err) {
			logger.error('Error loading student gap profile', err);
			this.error.set('No se pudo cargar la información del estudiante. Intentá recargar la página.');
		} finally {
			this.loading.set(false);
		}
	}
}
