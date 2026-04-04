import { Injectable } from '@angular/core';
import { BaseAdapter } from '../base/base.adapter';
import type { FormattedDate } from './date.adapter.models';

/**
 * Adapter para transformar Date a FormattedDate con múltiples formatos
 */
@Injectable({
	providedIn: 'root',
})
export class DateFormatAdapter extends BaseAdapter<Date, FormattedDate> {
	private readonly locale = 'es-PE';

	adapt(source: Date): FormattedDate {
		return {
			date: source,
			iso: source.toISOString(),
			short: this.formatShort(source),
			long: this.formatLong(source),
			relative: this.formatRelative(source),
			dayName: this.getDayName(source),
			monthName: this.getMonthName(source),
			time: this.formatTime(source),
		};
	}

	private formatShort(date: Date): string {
		return date.toLocaleDateString(this.locale, {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	}

	private formatLong(date: Date): string {
		return date.toLocaleDateString(this.locale, {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	}

	private formatTime(date: Date): string {
		return date.toLocaleTimeString(this.locale, {
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	private getDayName(date: Date): string {
		return date.toLocaleDateString(this.locale, { weekday: 'long' });
	}

	private getMonthName(date: Date): string {
		return date.toLocaleDateString(this.locale, { month: 'long' });
	}

	private formatRelative(date: Date): string {
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / 86_400_000);

		if (diffDays === 0) {
			return 'Hoy';
		} else if (diffDays === 1) {
			return 'Mañana';
		} else if (diffDays === -1) {
			return 'Ayer';
		} else if (diffDays > 1 && diffDays <= 7) {
			return `En ${diffDays} días`;
		} else if (diffDays < -1 && diffDays >= -7) {
			return `Hace ${Math.abs(diffDays)} días`;
		} else if (diffDays > 7) {
			return `En ${Math.floor(diffDays / 7)} semanas`;
		} else {
			return `Hace ${Math.floor(Math.abs(diffDays) / 7)} semanas`;
		}
	}
}
