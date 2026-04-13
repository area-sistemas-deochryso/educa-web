import { Injectable, inject } from '@angular/core';

import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { logger } from '@core/helpers';
import { environment } from '@env/environment';
import {
	CrearCierreMensualRequest,
	RevertirCierreMensualRequest,
} from '../models';
import { AttendancesAdminService } from './attendances-admin.service';
import { AttendancesAdminStore } from './attendances-admin.store';

const CIERRE_BASE = `${environment.apiUrl}/api/cierre-asistencia`;

/**
 * Gestión de cierres mensuales de asistencia.
 *
 * **Nota sobre consistencia**: crear/revertir cierre son operaciones
 * `server-confirmed` por diseño. Justificación: INV-AD03 / INV-AD04
 * (business-rules §1.10). Crear un cierre bloquea mutaciones de todo un
 * mes y queda auditado con observación del Director. Revertir requiere
 * intervención explícita del Director. Un rollback local no tiene sentido
 * porque el estado autoritativo vive en la tabla `CierreAsistenciaMensual`
 * del backend — fingir el cambio local mientras el servidor decide sería
 * inseguro.
 */
@Injectable({ providedIn: 'root' })
export class AttendancesCierresFacade {
	// #region Dependencias
	private api = inject(AttendancesAdminService);
	private store = inject(AttendancesAdminStore);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	// #endregion

	// #region Comandos

	crearCierre(dto: CrearCierreMensualRequest): void {
		this.wal.execute({
			operation: 'CUSTOM',
			resourceType: 'cierre-asistencia',
			endpoint: CIERRE_BASE,
			method: 'POST',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.crearCierre(dto),
			onCommit: (cierre) => {
				if (cierre) this.store.addCierre(cierre);
			},
			onError: (err) => {
				logger.error('Error al crear cierre:', err);
				this.errorHandler.showError('Error', 'No se pudo cerrar el mes');
			},
		});
	}

	revertirCierre(cierreId: number, dto: RevertirCierreMensualRequest): void {
		this.wal.execute({
			operation: 'CUSTOM',
			resourceType: 'cierre-asistencia',
			resourceId: cierreId,
			endpoint: `${CIERRE_BASE}/${cierreId}/revertir`,
			method: 'POST',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.revertirCierre(cierreId, dto),
			onCommit: (result) => {
				if (result) {
					this.store.updateCierre(cierreId, { activo: false, observacion: result.observacion });
				}
			},
			onError: (err) => {
				logger.error('Error al revertir cierre:', err);
				this.errorHandler.showError('Error', 'No se pudo revertir el cierre');
			},
		});
	}

	// #endregion
}
