import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EventMarkerKind } from '../event-type-marker';

// #region Implementation
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DATE_PARTS = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Insignia de fecha (día + mes o día de la semana). Recibe 'YYYY-MM-DD' y no usa `Date` para
 * el día y el mes, así evita el desfase de zona horaria de `new Date('YYYY-MM-DD')`.
 */
@Component({
	selector: 'app-date-badge',
	standalone: true,
	template: `
		@if (parts(); as p) {
			<span class="date-badge" [attr.data-kind]="kind()">
				<span class="day">{{ p.day }}</span>
				<span class="sub">{{ p.sub }}</span>
			</span>
		}
	`,
	styleUrl: './date-badge.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateBadgeComponent {
	/** 'YYYY-MM-DD' (se ignora cualquier hora posterior). */
	readonly date = input.required<string>();
	readonly kind = input<EventMarkerKind | null>(null);
	/** Línea inferior: mes abreviado o día de la semana. */
	readonly sub = input<'month' | 'weekday'>('month');

	readonly parts = computed(() => {
		const match = DATE_PARTS.exec(this.date());
		if (!match) return null;

		const year = Number(match[1]);
		const monthIndex = Number(match[2]) - 1;
		const day = Number(match[3]);
		const sub =
			this.sub() === 'weekday'
				? WEEKDAYS_SHORT[new Date(year, monthIndex, day).getDay()]
				: MONTHS_SHORT[monthIndex];

		return { day, sub: sub ?? '' };
	});
}
// #endregion
