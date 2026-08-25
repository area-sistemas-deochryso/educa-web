// #region Imports
import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EduButton, EduDialog, EduTextarea } from '@edu-ui';

// #endregion

export interface ExcepcionContext {
	cursoNombre: string;
}

@Component({
	selector: 'app-videoconferencia-excepcion-dialog',
	standalone: true,
	imports: [FormsModule, EduDialog, EduButton, EduTextarea],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './videoconferencia-excepcion-dialog.component.html',
	styleUrl: './videoconferencia-excepcion-dialog.component.scss',
})
export class VideoconferenciaExcepcionDialogComponent {
	// #region Inputs/Outputs
	readonly saving = input<boolean>(false);
	readonly visible = model<boolean>(false);
	readonly confirmar = output<string>();
	// #endregion

	// #region Estado local
	readonly context = signal<ExcepcionContext | null>(null);
	readonly motivoText = signal('');
	// #endregion

	// #region API pública
	open(ctx: ExcepcionContext): void {
		this.context.set(ctx);
		this.motivoText.set('');
		this.visible.set(true);
	}

	close(): void {
		this.visible.set(false);
		this.context.set(null);
		this.motivoText.set('');
	}
	// #endregion

	// #region Event handlers
	onVisibleChange(val: boolean): void {
		if (!val) this.close();
	}

	confirmarClick(): void {
		const motivo = this.motivoText().trim();
		if (!motivo) return;
		this.confirmar.emit(motivo);
	}
	// #endregion
}
