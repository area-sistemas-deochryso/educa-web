// #region Imports
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService, UserPermissionsService } from '@core/services';
import { SwService } from '@core/services/sw';
import {
	type MatriculaOfertaContexto,
	type MatriculaOfertaResultado,
	TITULO_AVISO_SIN_CARGO,
	avisoSinCargo,
	debeOfrecerMatricula,
} from '@features/intranet/pages/admin/pagos/matricula-oferta';
import { PagosApiService } from '@features/intranet/pages/admin/pagos/services';
import type { CrearUsuarioRequest } from '../models';
import { UsersStore } from './usuarios.store';
// #endregion

/**
 * Paso 2 del alta de un estudiante (P123 F8): ofrecer «Generar matrícula e inscripción» sin salir del diálogo.
 * - Solo se ofrece a un Estudiante con salón, con `PAGOS_API_MANAGE` y con conexión (sin conexión el alta sigue el camino
 *   optimista de siempre: ofrecer exige confirmación del servidor).
 * - El alta no devuelve el id del estudiante: se resuelve por DNI exacto. Si no se puede, el alta ya quedó hecha; el
 *   diálogo se cierra con un aviso. Ofrecer nunca bloquea ni deshace el alta.
 */
@Injectable({ providedIn: 'root' })
export class UsersMatriculaOfertaService {
	private readonly store = inject(UsersStore);
	private readonly permisos = inject(UserPermissionsService);
	private readonly sw = inject(SwService);
	private readonly pagosApi = inject(PagosApiService);
	private readonly errorHandler = inject(ErrorHandlerService);

	private readonly _oferta = signal<MatriculaOfertaContexto | null>(null);
	readonly oferta = this._oferta.asReadonly();

	constructor() {
		// Cerrar el diálogo (cancelar, X, guardar otro) descarta el paso 2: no debe reaparecer en el próximo alta.
		effect(() => {
			if (!this.store.dialogVisible()) this._oferta.set(null);
		});
	}

	/** Año del salón si corresponde ofrecer tras el alta; `null` si no. */
	anioParaOfertar(payload: Pick<CrearUsuarioRequest, 'rol' | 'salonId'>): number | null {
		if (!debeOfrecerMatricula(payload.rol, payload.salonId, this.permisos.hasCapability('PAGOS_API_MANAGE'))) return null;
		if (!this.sw.isOnline) return null;
		return this.store.salones().find((s) => s.salonId === payload.salonId)?.anio ?? null;
	}

	async abrir(dni: string, anio: number): Promise<void> {
		try {
			const encontrados = await firstValueFrom(this.pagosApi.buscarEstudiantes(dni, 2));
			const alumno = encontrados.length === 1 ? encontrados[0] : null;
			if (!alumno) throw new Error('DNI sin coincidencia única');
			this.store.setLoading(false);
			this._oferta.set({ estudianteId: alumno.estudianteId, nombre: alumno.nombreCompleto, anio });
		} catch (err) {
			logger.warn('No se pudo ofrecer generar la matrícula tras el alta', err);
			this.store.setLoading(false);
			this.store.closeDialog();
			this.errorHandler.showWarning(
				TITULO_AVISO_SIN_CARGO,
				'El alumno se creó, pero no se pudo ofrecer su matrícula. Genérala desde Pagos › Consistencia.',
			);
		}
	}

	/** Terminó el paso 2: si se omitió y el alumno quedó sin cargo, un aviso suave; luego se cierra el diálogo. */
	terminar(resultado: MatriculaOfertaResultado): void {
		const oferta = this._oferta();
		this.store.closeDialog();
		if (oferta && resultado.sinCargo) {
			this.errorHandler.showWarning(TITULO_AVISO_SIN_CARGO, avisoSinCargo(oferta.nombre));
		}
	}
}
