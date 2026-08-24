import { Injectable, signal } from '@angular/core';

export interface EduConfirmation {
	message: string;
	header?: string;
	icon?: string;
	acceptLabel?: string;
	rejectLabel?: string;
	acceptButtonStyleClass?: string;
	rejectButtonStyleClass?: string;
	accept?: () => void;
	reject?: () => void;
}

/**
 * Minimal scope: confirm() only. EduMessageService/toast (F4) is a separate service.
 */
@Injectable({ providedIn: 'root' })
export class EduConfirmationService {
	private readonly _confirmation = signal<EduConfirmation | null>(null);
	readonly confirmation = this._confirmation.asReadonly();

	confirm(options: EduConfirmation): void {
		this._confirmation.set(options);
	}

	close(): void {
		this._confirmation.set(null);
	}
}
