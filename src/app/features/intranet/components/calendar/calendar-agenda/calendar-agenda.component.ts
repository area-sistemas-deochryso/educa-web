// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DateBadgeComponent } from '@shared/components';
import type { CalendarEntry, EntrySelection } from '@features/intranet/pages/cross-role/calendary-component/calendar.types';
import {
	formatShortDate,
	getEntryKindLabel,
	ymdToDate,
} from '@features/intranet/pages/cross-role/calendary-component/calendar-entries.utils';

// #endregion
// #region Implementation
/** Lista de feriados y eventos del mes (o del día elegido), con acceso al detalle. */
@Component({
	selector: 'app-calendar-agenda',
	imports: [DateBadgeComponent],
	templateUrl: './calendar-agenda.component.html',
	styleUrl: './calendar-agenda.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarAgendaComponent {
	readonly heading = input.required<string>();
	readonly entries = input.required<CalendarEntry[]>();
	/** Con un día elegido se ofrece volver a la agenda de todo el mes. */
	readonly canClear = input(false);

	readonly entrySelect = output<EntrySelection>();
	readonly clearSelection = output<void>();

	meta(entry: CalendarEntry): string {
		const range = entry.end ? `${formatShortDate(entry.start)} – ${formatShortDate(entry.end)}` : '';
		return [getEntryKindLabel(entry.kind), range, entry.time, entry.location].filter(Boolean).join(' · ');
	}

	select(entry: CalendarEntry): void {
		this.entrySelect.emit({ entry, date: ymdToDate(entry.start) });
	}
}
// #endregion
