import { Injectable } from '@angular/core';
import { BaseBidirectionalAdapter } from '../base/base.adapter';

/**
 * Adapter para transformar fechas ISO a Date de JavaScript
 */
@Injectable({
	providedIn: 'root',
})
export class IsoDateAdapter extends BaseBidirectionalAdapter<string, Date> {
	// * Bidirectional ISO string <-> Date adapter.
	adapt(source: string): Date {
		return new Date(source);
	}

	reverse(target: Date): string {
		return target.toISOString();
	}
}
