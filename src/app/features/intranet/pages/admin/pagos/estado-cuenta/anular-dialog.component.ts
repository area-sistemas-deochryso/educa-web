// #region Imports
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduDialog, EduMessage, EduTextarea } from '@edu-ui';
// #endregion

export interface AnularContexto {
	titulo: string;
	/** Líneas que identifican lo que se anula (monto, fecha, cargo…). */
	resumen: string[];
	/** Aviso destacado antes de confirmar (pago de familia). */
	aviso: string | null;
}

/** Diálogo de anulación (pago o ajuste): muestra qué se anula y exige un motivo. No sabe qué request dispara. */
@Component({
	selector: 'app-anular-dialog',
	standalone: true,
	imports: [FormsModule, EduDialog, EduButton, EduMessage, EduTextarea],
	templateUrl: './anular-dialog.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnularDialogComponent {
	readonly guardando = input(false);
	readonly error = input<string | null>(null);
	readonly confirmar = output<string>();
	readonly cancelar = output<void>();

	protected readonly visible = signal(false);
	protected readonly contexto = signal<AnularContexto | null>(null);
	protected readonly motivo = signal('');

	open(contexto: AnularContexto): void {
		this.contexto.set(contexto);
		this.motivo.set('');
		this.visible.set(true);
	}

	close(): void {
		this.visible.set(false);
	}

	protected onVisibleChange(visible: boolean): void {
		if (visible) return;
		this.visible.set(false);
		this.cancelar.emit();
	}

	protected aceptar(): void {
		const motivo = this.motivo().trim();
		if (!motivo || this.guardando()) return;
		this.confirmar.emit(motivo);
	}
}
