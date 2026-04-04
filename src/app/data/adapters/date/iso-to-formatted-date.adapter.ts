import { Injectable, inject } from '@angular/core';
import { BaseAdapter } from '../base/base.adapter';
import { IsoDateAdapter } from './iso-date.adapter';
import { DateFormatAdapter } from './date-format.adapter';
import type { FormattedDate } from './date.adapter.models';

/**
 * Adapter para transformar string ISO a FormattedDate
 */
@Injectable({
	providedIn: 'root',
})
export class IsoToFormattedDateAdapter extends BaseAdapter<string, FormattedDate> {
	private isoAdapter = inject(IsoDateAdapter);
	private formatAdapter = inject(DateFormatAdapter);
	constructor() {
		super();
	}

	adapt(source: string): FormattedDate {
		const date = this.isoAdapter.adapt(source);
		return this.formatAdapter.adapt(date);
	}
}
