// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EventTypeMarkerComponent, type EventMarkerKind } from '@shared/components';
import { getEntryKindLabel } from '@features/intranet/pages/cross-role/calendary-component/calendar-entries.utils';

// #endregion
// #region Implementation
const KINDS: EventMarkerKind[] = ['holiday', 'academic', 'cultural', 'sports', 'meeting', 'other'];

/** Leyenda: cada tipo con la misma forma y color que usa el calendario. */
@Component({
	selector: 'app-calendar-legend',
	imports: [EventTypeMarkerComponent],
	templateUrl: './calendar-legend.component.html',
	styleUrl: './calendar-legend.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarLegendComponent {
	readonly items = KINDS.map((kind) => ({ kind, label: getEntryKindLabel(kind) }));
	/** "Hoy" se dibuja como en el mes (círculo con el número) para no confundirlo con el marcador de Reunión. */
	readonly todayDay = new Date().getDate();
}
// #endregion
