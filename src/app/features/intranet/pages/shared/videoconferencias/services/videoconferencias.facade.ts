// #region Imports
import { Injectable, inject, DestroyRef, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { UserProfileService } from '@core/services/user/user-profile.service';
import { environment } from '@config/environment';
import { VideoconferenciasStore, VideoconferenciaItem } from './videoconferencias.store';

// #endregion

interface JaaSTokenResponse {
	jwt: string;
}

interface HorarioDto {
	id: number;
	cursoId: number;
	cursoNombre: string;
	salonDescripcion: string;
	diaSemanaDescripcion: string;
	horaInicio: string;
	horaFin: string;
	profesorNombreCompleto: string | null;
	cantidadEstudiantes: number;
}

// #region Implementation
@Injectable({ providedIn: 'root' })
export class VideoconferenciasFacade {
	// #region Dependencias
	private readonly http = inject(HttpClient);
	private readonly store = inject(VideoconferenciasStore);
	private readonly userProfile = inject(UserProfileService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly baseUrl = environment.apiUrl;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	readonly displayName = this.userProfile.displayName;
	readonly jaasAppId = environment.jitsi.appId;

	readonly isModerator = computed(() => {
		const role = this.userProfile.userRole();
		return role === 'Profesor' || role === 'Director' || role === 'Asistente Administrativo';
	});
	// #endregion

	// #region Comandos de carga
	loadCursos(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);
		this.store.setError(null);

		this.getHorariosByRole()
			.pipe(
				withRetry({ tag: 'VideoconferenciasFacade:loadCursos' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (horarios) => {
					const items = this.mapToItems(horarios);
					this.store.setItems(items);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('VideoconferenciasFacade: Error al cargar cursos', err);
					this.errorHandler.showError('Error', 'No se pudieron cargar los cursos');
					this.store.setError('No se pudieron cargar los cursos');
					this.store.setLoading(false);
				},
			});
	}
	// #endregion

	// #region Comandos de sala
	enterSala(item: VideoconferenciaItem): void {
		this.store.enterSala(item);
	}

	leaveSala(): void {
		this.store.leaveSala();
	}

	/** Obtiene un JWT firmado del backend para autenticarse con JaaS. */
	getJaaSToken(roomName: string): Observable<JaaSTokenResponse> {
		return this.http.get<JaaSTokenResponse>(
			`${this.baseUrl}/api/Videoconferencia/token`,
			{ params: { roomName } },
		);
	}

	/** Genera el nombre de sala determinístico para Jitsi. */
	getRoomName(horarioId: number, cursoNombre: string): string {
		const sanitized = cursoNombre
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Quitar acentos (ó → o)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '')
			.replace(/(^-|-$)/g, '');
		return `educawebsala${horarioId}${sanitized}`;
	}
	// #endregion

	// #region Helpers privados
	private getHorariosByRole(): Observable<HorarioDto[]> {
		const role = this.userProfile.userRole();
		const entityId = this.userProfile.entityId();

		if (role === 'Estudiante') {
			return this.http
				.get<HorarioDto[]>(`${this.baseUrl}/api/EstudianteCurso/mis-horarios`)
				.pipe(catchError(() => of([])));
		}

		if (role === 'Profesor' && entityId) {
			return this.http
				.get<HorarioDto[]>(`${this.baseUrl}/api/Horario/profesor/${entityId}`)
				.pipe(catchError(() => of([])));
		}

		// Admin roles: Director, Asistente Administrativo
		return this.http
			.get<HorarioDto[]>(`${this.baseUrl}/api/Horario`)
			.pipe(catchError(() => of([])));
	}

	private mapToItems(horarios: HorarioDto[]): VideoconferenciaItem[] {
		return horarios.map((h) => ({
			horarioId: h.id,
			cursoId: h.cursoId,
			cursoNombre: h.cursoNombre,
			salonDescripcion: h.salonDescripcion,
			diaSemanaDescripcion: h.diaSemanaDescripcion,
			horaInicio: h.horaInicio,
			horaFin: h.horaFin,
			profesorNombreCompleto: h.profesorNombreCompleto,
			cantidadEstudiantes: h.cantidadEstudiantes,
		}));
	}
	// #endregion
}
// #endregion
