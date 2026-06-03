import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RecipientSummary } from '@data/models';
import { RecipientViewApiService } from '../services/recipient-view-api.service';

@Injectable({ providedIn: 'root' })
export class RecipientViewDataFacade {
	private api = inject(RecipientViewApiService);

	private readonly _summary = signal<RecipientSummary | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);

	readonly summary = this._summary.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();

	async load(correo: string): Promise<void> {
		this._loading.set(true);
		this._error.set(false);
		this._summary.set(null);

		try {
			const data = await firstValueFrom(this.api.getSummary(correo));
			this._summary.set(data);
			if (!data) this._error.set(true);
		} catch {
			this._error.set(true);
		} finally {
			this._loading.set(false);
		}
	}

	reset(): void {
		this._summary.set(null);
		this._loading.set(false);
		this._error.set(false);
	}
}
