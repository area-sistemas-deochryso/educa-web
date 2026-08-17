// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services';
import { environment } from '@env/environment';
import { SolicitudJustificacionAsistenciaDto } from '@features/intranet/pages/estudiante/models';

import { JustificacionAsistenciaBandejaApiService } from '@intranet-shared/services/justificacion-asistencia/justificacion-asistencia-bandeja-api.service';
// #endregion

/**
 * Estado + carga de la bandeja de aprobación (Plan 101 F4). Scoped al
 * componente, mismo criterio que `TicketBandejaFacade`. `server-confirmed`
 * simple (sin `optimistic.apply`/`rollback` reales): el backend no versiona
 * con RowVersion acá — "ya resuelta" es una regla de negocio (422, no 409),
 * confirmado contra `JustificacionAsistenciaService.cs` antes de decidir el
 * nivel de manejo de conflicto (Decisión 4 del brief).
 */
@Injectable()
export class JustificacionAsistenciaBandejaFacade {
	// #region Dependencies
	private readonly api = inject(JustificacionAsistenciaBandejaApiService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	// #endregion

	// #region State
	private readonly _solicitudes = signal<SolicitudJustificacionAsistenciaDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);
	private readonly _resolvingId = signal<number | null>(null);

	readonly solicitudes = this._solicitudes.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly resolvingId = this._resolvingId.asReadonly();
	// #endregion

	// #region Commands
	init(): void {
		this.loadBandeja();
	}

	aprobar(solicitud: SolicitudJustificacionAsistenciaDto): void {
		this._resolvingId.set(solicitud.id);

		this.wal.execute<SolicitudJustificacionAsistenciaDto>({
			operation: 'UPDATE',
			resourceType: 'justificacion-asistencia',
			resourceId: solicitud.id,
			endpoint: `${environment.apiUrl}/api/justificacion-asistencia/${solicitud.id}/aprobar`,
			method: 'POST',
			payload: {},
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.aprobar(solicitud.id),
			optimistic: { apply: () => {}, rollback: () => {} },
			onCommit: (resultado) => {
				this._resolvingId.set(null);
				this.replaceSolicitud(resultado);
				this.errorHandler.showSuccess('Solicitud aprobada', `La solicitud de ${solicitud.estudianteNombre} fue aprobada.`);
			},
			onError: (err) => this.handleResolveError(err, solicitud),
		});
	}

	rechazar(solicitud: SolicitudJustificacionAsistenciaDto, motivo: string, onSuccess: () => void): void {
		this._resolvingId.set(solicitud.id);

		this.wal.execute<SolicitudJustificacionAsistenciaDto>({
			operation: 'UPDATE',
			resourceType: 'justificacion-asistencia',
			resourceId: solicitud.id,
			endpoint: `${environment.apiUrl}/api/justificacion-asistencia/${solicitud.id}/rechazar`,
			method: 'POST',
			payload: { motivo },
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.rechazar(solicitud.id, motivo),
			optimistic: { apply: () => {}, rollback: () => {} },
			onCommit: (resultado) => {
				this._resolvingId.set(null);
				this.replaceSolicitud(resultado);
				this.errorHandler.showSuccess('Solicitud rechazada', `La solicitud de ${solicitud.estudianteNombre} fue rechazada.`);
				onSuccess();
			},
			onError: (err) => this.handleResolveError(err, solicitud),
		});
	}
	// #endregion

	// #region Private helpers
	private loadBandeja(): void {
		this._loading.set(true);
		this._error.set(false);

		this.api
			.getBandeja()
			.pipe(
				catchError((err) => {
					logger.warn('[JustificacionAsistenciaBandejaFacade] Error cargando bandeja', err?.status);
					this._error.set(true);
					return of([] as SolicitudJustificacionAsistenciaDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((solicitudes) => {
				this._solicitudes.set(solicitudes);
				this._loading.set(false);
			});
	}

	private replaceSolicitud(actualizada: SolicitudJustificacionAsistenciaDto): void {
		this._solicitudes.update((solicitudes) =>
			solicitudes.map((s) => (s.id === actualizada.id ? actualizada : s)),
		);
	}

	private handleResolveError(err: unknown, solicitud: SolicitudJustificacionAsistenciaDto): void {
		this._resolvingId.set(null);
		const status = err instanceof HttpErrorResponse ? err.status : null;
		logger.warn('[JustificacionAsistenciaBandejaFacade] Error resolviendo solicitud', status);

		if (status === 422) {
			this.errorHandler.showWarning(
				'Solicitud ya resuelta',
				`La solicitud de ${solicitud.estudianteNombre} ya fue resuelta por otro usuario. Se refrescó la bandeja.`,
			);
			this.loadBandeja();
			return;
		}

		this.errorHandler.showError('No se pudo resolver la solicitud', `Error al procesar la solicitud de ${solicitud.estudianteNombre}.`);
	}
	// #endregion
}
