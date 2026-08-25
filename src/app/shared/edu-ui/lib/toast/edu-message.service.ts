import { Injectable, signal } from '@angular/core';

export type EduToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface EduToastMessageOptions {
	severity: EduToastSeverity;
	summary: string;
	detail: string;
	life?: number;
	sticky?: boolean;
	key?: string;
	data?: unknown;
}

export interface EduToastMessage extends EduToastMessageOptions {
	id: number;
}

/**
 * providedIn: 'root' by default, but every real usage relies on Angular's DI hierarchy to scope
 * a fresh instance: consumers that need a local (non-global) toast add `providers: [EduMessageService]`
 * on their own component, no API change required on either edu-toast or this service.
 */
@Injectable({ providedIn: 'root' })
export class EduMessageService {
	private readonly _messages = signal<EduToastMessage[]>([]);
	readonly messages = this._messages.asReadonly();

	private nextId = 0;

	add(message: EduToastMessageOptions): void {
		this._messages.update((messages) => [...messages, { ...message, id: this.nextId++ }]);
	}

	remove(id: number): void {
		this._messages.update((messages) => messages.filter((message) => message.id !== id));
	}

	clear(key?: string): void {
		this._messages.update((messages) => (key === undefined ? [] : messages.filter((message) => message.key !== key)));
	}
}
