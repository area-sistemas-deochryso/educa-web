// #region Imports
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { FeedbackReportFacade, REPORTE_TIPO_OPTIONS, ReporteTipo } from '@core/services/feedback';

// #endregion
// #region Implementation
/**
 * Dialog global para reportar un problema o proponer mejoras.
 * Se abre vía `FeedbackReportFacade.open()` (botón FAB o atajo Ctrl+Alt+F).
 * - Siempre montado en el DOM (regla dialogs-sync.md, NUNCA dentro de @if).
 * - Sincronización correcta: `[visible]` + `(visibleChange)`.
 */
@Component({
	selector: 'app-feedback-report-dialog',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		CheckboxModule,
		SelectModule,
		TextareaModule,
		MessageModule,
	],
	templateUrl: './feedback-report-dialog.component.html',
	styleUrl: './feedback-report-dialog.component.scss',
})
export class FeedbackReportDialogComponent {
	private readonly facade = inject(FeedbackReportFacade);

	readonly vm = this.facade.vm;
	readonly tipoOptions = REPORTE_TIPO_OPTIONS;

	// Flag local para mostrar errores de validación solo DESPUÉS del primer intento de submit.
	readonly showValidation = signal(false);

	constructor() {
		// Cuando el dialog se cierra desde cualquier vía, limpiamos el estado de validación local.
		effect(() => {
			if (!this.vm().dialogVisible) {
				this.showValidation.set(false);
			}
		});

		// Cierre automático 1.8s después de envío exitoso para dar feedback visual.
		effect(() => {
			if (this.vm().lastSubmittedOk) {
				const timeout = setTimeout(() => this.facade.close(), 1800);
				return () => clearTimeout(timeout);
			}
			return undefined;
		});
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.close();
		}
	}

	onTipoChange(tipo: ReporteTipo | null): void {
		this.facade.updateForm({ tipo });
	}

	onDescripcionChange(value: string): void {
		this.facade.updateForm({ descripcion: value });
	}

	onPropuestaChange(value: string): void {
		this.facade.updateForm({ propuesta: value });
	}

	onLinkToRecentErrorChange(value: boolean): void {
		this.facade.setLinkToRecentError(value);
	}

	onSubmit(): void {
		this.showValidation.set(true);
		if (!this.vm().isValid || this.vm().submitting) return;

		this.facade.submit({
			url: typeof location !== 'undefined' ? location.href : '',
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
		});
	}

	onCancel(): void {
		this.facade.close();
	}
}
// #endregion
