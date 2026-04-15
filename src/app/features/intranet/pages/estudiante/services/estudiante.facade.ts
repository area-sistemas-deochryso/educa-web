import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { EstudianteApiService } from './estudiante-api.service';
import {
	HorarioProfesorDto,
	MiAsistenciaCursoResumenDto,
} from '../models';

/**
 * Thin facade for student-scoped reads shared by sub-features (foro, mensajeria,
 * attendance, schedules). Shields components from `EstudianteApiService` so the
 * `-api.service` lint rule can stay enforced without duplicating sub-feature
 * facades that own their own stores (EstudianteCursosFacade, StudentSchedulesFacade).
 */
@Injectable({ providedIn: 'root' })
export class EstudianteFacade {
	private readonly api = inject(EstudianteApiService);

	getMisHorarios(): Observable<HorarioProfesorDto[]> {
		return this.api.getMisHorarios();
	}

	getMiAsistencia(horarioId: number): Observable<MiAsistenciaCursoResumenDto | null> {
		return this.api.getMiAsistencia(horarioId);
	}

	getServerTime(): Observable<string | null> {
		return this.api.getServerTime();
	}
}
