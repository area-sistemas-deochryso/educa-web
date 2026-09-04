// #region Imports
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { EduButton, EduConfirmDialog, EduConfirmationService, EduTag } from '@edu-ui';

import { BorradoMasivoResponseDto } from '../../models';

// #endregion
// #region Implementation
/**
 * Control reusable de borrado masivo (P107 F4) — mismo botón + confirmación + resultado
 * para cualquier entidad, instanciado una vez por entidad desde el panel padre.
 */
@Component({
	selector: 'app-bulk-delete-action',
	standalone: true,
	imports: [EduButton, EduTag, EduConfirmDialog],
	providers: [EduConfirmationService],
	templateUrl: './bulk-delete-action.component.html',
	styleUrl: './bulk-delete-action.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkDeleteActionComponent {
	private readonly confirmationService = inject(EduConfirmationService);

	readonly entityLabel = input.required<string>();
	readonly deleting = input<boolean>(false);
	readonly result = input<BorradoMasivoResponseDto | null>(null);

	readonly eliminar = output<void>();

	onEliminarClick(): void {
		this.confirmationService.confirm({
			header: 'Confirmar eliminación',
			message: `¿Eliminar todos los ${this.entityLabel()} de prueba marcados? Esta acción no se puede deshacer.`,
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.eliminar.emit(),
		});
	}
}
// #endregion
