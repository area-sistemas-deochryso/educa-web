// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EventTypeMarkerComponent } from '@shared/components';
import type {
	CalendarDay,
	CalendarEntry,
	CalendarMonth,
	EntrySelection,
} from '@features/intranet/pages/cross-role/calendary-component/calendar.types';
import { entriesOnDay, toYmd } from '@features/intranet/pages/cross-role/calendary-component/calendar-entries.utils';

// #endregion
// #region Implementation
const MAX_CHIPS = 2;
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface CellChip {
	entry: CalendarEntry;
	/** El título se escribe el día de inicio y al comenzar cada semana; el resto del rango es una franja. */
	showLabel: boolean;
}

interface MonthCell {
	day: CalendarDay;
	key: string;
	chips: CellChip[];
	extra: number;
	ariaLabel: string;
}

/** Mes grande: cada día muestra hasta 2 títulos de evento; el resto se consulta en la agenda. */
@Component({
	selector: 'app-calendar-month-view',
	imports: [EventTypeMarkerComponent],
	templateUrl: './calendar-month-view.component.html',
	styleUrl: './calendar-month-view.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarMonthViewComponent {
	readonly month = input.required<CalendarMonth>();
	readonly entries = input.required<CalendarEntry[]>();
	readonly selectedKey = input<string | null>(null);

	readonly entrySelect = output<EntrySelection>();
	readonly daySelect = output<string>();

	readonly weekdays = WEEKDAYS;

	readonly cells = computed<MonthCell[]>(() =>
		this.month().days.map((day, index) => {
			const key = toYmd(day.fullDate);
			const all = day.isCurrentMonth ? entriesOnDay(this.entries(), key) : [];
			const chips = all
				.slice(0, MAX_CHIPS)
				.map((entry) => ({ entry, showLabel: entry.start === key || index % 7 === 0 }));
			const extra = all.length - chips.length;
			const count = all.length === 0 ? 'sin entradas' : all.length === 1 ? '1 entrada' : `${all.length} entradas`;

			return { day, key, chips, extra, ariaLabel: `${day.date} de ${this.month().name}, ${count}` };
		}),
	);
}
// #endregion
