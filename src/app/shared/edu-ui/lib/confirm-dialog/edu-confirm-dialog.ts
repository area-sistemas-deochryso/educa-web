import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EduButton } from '../button/edu-button';
import { EduDialog } from '../dialog/edu-dialog';
import { EduConfirmation, EduConfirmationService } from './edu-confirmation.service';

/**
 * One global instance per app — no inputs, driven entirely by EduConfirmationService.confirm().
 * Composes over edu-dialog rather than reimplementing overlay/focus-trap.
 */
@Component({
	selector: 'edu-confirm-dialog',
	standalone: true,
	imports: [EduDialog, EduButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (confirmationService.confirmation(); as confirmation) {
			<edu-dialog
				[visible]="true"
				(visibleChange)="onVisibleChange($event)"
				[header]="confirmation.header ?? ''"
				[modal]="true"
				[closable]="true"
				[dismissableMask]="false"
				styleClass="edu-confirm-dialog"
			>
				<div class="edu-confirm-dialog__body">
					@if (confirmation.icon) {
						<i class="edu-confirm-dialog__icon" [class]="confirmation.icon"></i>
					}
					<span>{{ confirmation.message }}</span>
				</div>
				<div class="edu-confirm-dialog__footer">
					<edu-button
						[label]="confirmation.rejectLabel ?? 'Cancelar'"
						[class]="confirmation.rejectButtonStyleClass ?? ''"
						[text]="true"
						(click)="onReject(confirmation)"
					></edu-button>
					<edu-button
						[label]="confirmation.acceptLabel ?? 'Aceptar'"
						[class]="confirmation.acceptButtonStyleClass ?? ''"
						(click)="onAccept(confirmation)"
					></edu-button>
				</div>
			</edu-dialog>
		}
	`,
	styles: `
		.edu-confirm-dialog__body {
			display: flex;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.edu-confirm-dialog__icon {
			font-size: 1.5rem;
			color: var(--eduui-orange-500);
		}

		.edu-confirm-dialog__footer {
			display: flex;
			justify-content: flex-end;
			gap: 0.5rem;
			margin-top: 1.5rem;
		}
	`,
})
export class EduConfirmDialog {
	protected readonly confirmationService = inject(EduConfirmationService);

	protected onAccept(confirmation: EduConfirmation): void {
		confirmation.accept?.();
		this.confirmationService.close();
	}

	protected onReject(confirmation: EduConfirmation): void {
		confirmation.reject?.();
		this.confirmationService.close();
	}

	protected onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.confirmationService.close();
		}
	}
}
