import { Injectable, inject } from '@angular/core';
import { EduConfirmationService } from '@edu-ui';

// #region Types
export interface UnsavedChangesPromptOptions {
	/** Qué se pierde, en lenguaje del usuario: «Tienes cambios de asistencia sin guardar.» */
	message: string;
	/** Si el aviso puede ofrecer «Guardar y salir» (el rol decide si guardar desde fuera de su formulario es seguro). */
	canSave: boolean;
	/** Guarda las ediciones; `true` solo si el servidor las confirmó. */
	save: () => Promise<boolean>;
}
// #endregion

// #region Implementation
/**
 * Aviso de «cambios sin guardar» reutilizable. No es `root`: se provee junto a
 * `EduConfirmationService` en el componente que hospeda `<edu-confirm-dialog />`,
 * para abrir el diálogo de ese scope.
 *
 * Resuelve `true` cuando se puede continuar (descartó o guardó con éxito) y `false`
 * cuando debe quedarse (Quedarme, X/ESC, o el guardado falló).
 */
@Injectable()
export class UnsavedChangesPromptService {
	private readonly confirmation = inject(EduConfirmationService);

	confirmProceed(options: UnsavedChangesPromptOptions): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const base = {
				header: 'Cambios sin guardar',
				message: options.message,
				icon: 'pi pi-exclamation-triangle',
				rejectLabel: 'Quedarme',
				reject: () => resolve(false),
				dismiss: () => resolve(false),
			};

			if (!options.canSave) {
				this.confirmation.confirm({
					...base,
					acceptLabel: 'Salir sin guardar',
					accept: () => resolve(true),
				});
				return;
			}

			this.confirmation.confirm({
				...base,
				acceptLabel: 'Guardar y salir',
				accept: () => void options.save().then(resolve, () => resolve(false)),
				alternateLabel: 'Salir sin guardar',
				alternate: () => resolve(true),
			});
		});
	}
}
// #endregion
