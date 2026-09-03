// #region Imports
import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { ErrorHandlerService } from '@core/services/error';
import { SedesApiService } from '@features/intranet/pages/admin/users/services/sedes-api.service';
import { SedeSimpleDto } from '@features/intranet/pages/admin/users/models';
import { ApiResponse } from '@shared/models';

import { AttendanceSimulationApiService } from './attendance-simulation-api.service';
import { AttendanceSimulationTriggerDto } from '../models';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class CrosschexTriggerFacade {
	private readonly sedesApi = inject(SedesApiService);
	private readonly triggerApi = inject(AttendanceSimulationApiService);
	private readonly errorHandler = inject(ErrorHandlerService);

	listarSedes(): Observable<SedeSimpleDto[]> {
		return this.sedesApi.listar();
	}

	/**
	 * El endpoint responde 200 incluso cuando la marcación no se registró (ej. "Sede no
	 * encontrada o inactiva") — el resultado real está en el mensaje, mismo criterio que
	 * usa el propio backend (AsistenciaService) para distinguir éxito de rechazo.
	 */
	trigger(dto: AttendanceSimulationTriggerDto): Observable<ApiResponse> {
		return this.triggerApi.trigger(dto).pipe(
			tap((response) => {
				const registrada =
					response.mensaje.startsWith('Entrada registrada') || response.mensaje.startsWith('Salida registrada');
				if (registrada) {
					this.errorHandler.showSuccess('Marcación simulada', response.mensaje);
				} else {
					this.errorHandler.showWarning('Marcación no registrada', response.mensaje);
				}
			}),
			catchError((err: HttpErrorResponse) => {
				this.errorHandler.handleHttpError(err, { method: 'POST' });
				return throwError(() => err);
			}),
		);
	}
}
// #endregion
