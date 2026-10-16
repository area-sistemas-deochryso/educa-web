// #region Imports
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ProfesorApiService } from '@features/intranet/pages/profesor/services';
import { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

// #endregion
// #region Implementation
/**
 * Horario semanal del profesor para los widgets del Inicio. Se provee en `HomeComponent`
 * (una instancia por visita al Inicio) para que los widgets que lo necesitan compartan una
 * sola petición en vez de pedir cada uno la suya.
 */
@Injectable()
export class ProfesorHorarioHomeService {
	private readonly profesorApi = inject(ProfesorApiService);
	private horarios$: Observable<HorarioProfesorDto[]> | null = null;

	getHorarios(profesorId: number): Observable<HorarioProfesorDto[]> {
		this.horarios$ ??= this.profesorApi.getHorarios(profesorId).pipe(shareReplay({ bufferSize: 1, refCount: false }));
		return this.horarios$;
	}
}
// #endregion
