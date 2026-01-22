import { Injectable } from '@angular/core';
import { BaseAdapter, BaseBidirectionalAdapter } from './base.adapter';

/**
 * Adapter para transformar fechas ISO a Date de JavaScript
 */
@Injectable({
	providedIn: 'root',
})
export class IsoDateAdapter extends BaseBidirectionalAdapter<string, Date> {
	adapt(source: string): Date {
		return new Date(source);
	}

	reverse(target: Date): string {
		return target.toISOString();
	}
}

/**
 * Modelo de fecha formateada para la UI
 */
export interface FormattedDate {
	date: Date;
	iso: string;
	short: string; // 22/01/2026
	long: string; // 22 de enero de 2026
	relative: string; // hace 2 días, mañana, etc.
	dayName: string; // Miércoles
	monthName: string; // Enero
	time: string; // 14:30
}

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
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

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

/**
 * Adapter para transformar string ISO a FormattedDate
 */
@Injectable({
	providedIn: 'root',
})
export class IsoToFormattedDateAdapter extends BaseAdapter<string, FormattedDate> {
	constructor(
		private isoAdapter: IsoDateAdapter,
		private formatAdapter: DateFormatAdapter,
	) {
		super();
	}

	adapt(source: string): FormattedDate {
		const date = this.isoAdapter.adapt(source);
		return this.formatAdapter.adapt(date);
	}
}
