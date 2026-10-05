import { Injectable, signal } from '@angular/core';

export interface EduConfirmation {
	message: string;
	header?: string;
	icon?: string;
	acceptLabel?: string;
	rejectLabel?: string;
	acceptButtonStyleClass?: string;
	rejectButtonStyleClass?: string;
	/** Optional third action (rendered between reject and accept), e.g. «Salir sin guardar» next to «Guardar y salir». */
	alternateLabel?: string;
	alternateButtonStyleClass?: string;
	accept?: () => void;
	reject?: () => void;
	alternate?: () => void;
	/** Closed without choosing (X / ESC). Not called after accept, reject or alternate. */
	dismiss?: () => void;
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
