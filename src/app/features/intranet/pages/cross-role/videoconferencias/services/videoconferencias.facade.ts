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
import { canModerateVideoconference, getHorarioEndpoint } from '@shared/models';
import { VideoconferenciasStore } from './videoconferencias.store';
import { VideoconferenciaItem } from './videoconferencias.models';

// #endregion

interface JaaSTokenResponse {
	jwt: string;
	appId: string;
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

	readonly isModerator = computed(() => canModerateVideoconference(this.userProfile.userRole()));
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
	/** Resuelve el endpoint de horarios consultando la policy del rol. */
	private getHorariosByRole(): Observable<HorarioDto[]> {
		const endpoint = getHorarioEndpoint(this.userProfile.userRole());
		const entityId = this.userProfile.entityId();

		const HORARIO_ENDPOINTS: Record<string, string> = {
			'mis-horarios': `${this.baseUrl}/api/EstudianteCurso/mis-horarios`,
			'by-profesor': `${this.baseUrl}/api/Horario/profesor/${entityId}`,
			all: `${this.baseUrl}/api/Horario`,
		};

		return this.http
			.get<HorarioDto[]>(HORARIO_ENDPOINTS[endpoint])
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
