import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { BlacklistService } from '../../email-outbox/services/blacklist.service';
import { EmailQuarantineService } from '../../email-outbox/services/email-quarantine.service';

/**
 * Acciones inline de Recipient View (P68 F4b). Llama directo a los servicios
 * HTTP que ya usan las páginas de defensa (blacklist, cuarentena) — sin pasar
 * por sus CRUD facades, que están acopladas al estado de esas listas.
 */
@Injectable({ providedIn: 'root' })
export class RecipientViewActionsFacade {
	private readonly blacklistApi = inject(BlacklistService);
	private readonly quarantineApi = inject(EmailQuarantineService);
	private readonly errorHandler = inject(ErrorHandlerService);

	private readonly _actionInFlight = signal(false);
	readonly actionInFlight = this._actionInFlight.asReadonly();

	async blacklistAdd(correo: string): Promise<boolean> {
		return this.run(async () => {
			await firstValueFrom(this.blacklistApi.crear({ correo, motivo: 'MANUAL' }));
			this.errorHandler.showSuccess('Bloqueo registrado', `${correo} agregado a la blacklist.`);
		}, 'blacklistAdd');
	}

	async blacklistUnblock(correo: string): Promise<boolean> {
		return this.run(async () => {
			await firstValueFrom(this.blacklistApi.despejar(correo));
			this.errorHandler.showSuccess('Bloqueo despejado', `${correo} ya no está bloqueado.`);
		}, 'blacklistUnblock');
	}

	async releaseQuarantine(correo: string): Promise<boolean> {
		return this.run(async () => {
			const pagina = await firstValueFrom(
				this.quarantineApi.getPaginado({ estado: 'activa', motivo: null, q: correo }, 1, 5),
			);
			const entry = pagina.data.find(
				(i) => i.destinatario.toLowerCase() === correo.toLowerCase(),
			);
			if (!entry) {
				this.errorHandler.showWarning('Cuarentena no encontrada', `${correo} ya no está en cuarentena.`);
				return;
			}
			await firstValueFrom(
				this.quarantineApi.liberar(entry.id, {
					rowVersion: entry.rowVersion,
					motivoLiberacion: 'OTRO',
					observacion: 'Liberado desde Recipient View.',
				}),
			);
			this.errorHandler.showSuccess('Cuarentena liberada', `${correo} ya no está en cuarentena.`);
		}, 'releaseQuarantine');
	}

	private async run(op: () => Promise<void>, label: string): Promise<boolean> {
		this._actionInFlight.set(true);
		try {
			await op();
			return true;
		} catch (err) {
			logger.error(`[RecipientViewActionsFacade] Error en ${label}`, err);
			this.errorHandler.showError('No se pudo completar la acción', 'Intenta de nuevo.');
			return false;
		} finally {
			this._actionInFlight.set(false);
		}
	}
}
