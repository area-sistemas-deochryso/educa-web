// #region Imports
import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, OperatorFunction, pipe, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { ErrorHandlerService } from '@core/services/error';

import { BulkTestDataApiService } from './bulk-test-data-api.service';
import { CreacionMasivaResponseDto, CrearCursoDto, CrearSalonDto } from '../models';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class BulkTestDataFacade {
	private readonly api = inject(BulkTestDataApiService);
	private readonly errorHandler = inject(ErrorHandlerService);

	generarSalones(cantidad: number): Observable<CreacionMasivaResponseDto> {
		return this.api.generarSalones(cantidad).pipe(this.resultPipe('salones'));
	}

	loteSalones(salones: CrearSalonDto[]): Observable<CreacionMasivaResponseDto> {
		return this.api.loteSalones(salones).pipe(this.resultPipe('salones'));
	}

	generarCursos(cantidad: number): Observable<CreacionMasivaResponseDto> {
		return this.api.generarCursos(cantidad).pipe(this.resultPipe('cursos'));
	}

	loteCursos(cursos: CrearCursoDto[]): Observable<CreacionMasivaResponseDto> {
		return this.api.loteCursos(cursos).pipe(this.resultPipe('cursos'));
	}

	private resultPipe(entidadLabel: string): OperatorFunction<CreacionMasivaResponseDto, CreacionMasivaResponseDto> {
		return pipe(
			tap((response: CreacionMasivaResponseDto) => {
				if (response.creados > 0) {
					this.errorHandler.showSuccess('Creación masiva', `${response.creados} ${entidadLabel} creados`);
				}
				if (response.rechazados > 0) {
					this.errorHandler.showWarning(
						'Filas rechazadas',
						`${response.rechazados} fila(s) de ${entidadLabel} rechazadas — revisá el detalle`,
					);
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
