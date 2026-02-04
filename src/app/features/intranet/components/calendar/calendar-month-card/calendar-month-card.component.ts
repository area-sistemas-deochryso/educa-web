import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarDay, CalendarMonth } from '@features/intranet/pages/calendary-component/calendar.types';

@Component({
	selector: 'app-calendar-month-card',
	imports: [CommonModule],
	templateUrl: './calendar-month-card.component.html',
	styleUrl: './calendar-month-card.component.scss',
	host: {
		'[attr.data-hovered-event]': 'hoveredEvent()',
	},
})
export class CalendarMonthCardComponent {
	// * Month data + day click output.
	month = input.required<CalendarMonth>();

	dayClick = output<CalendarDay>();

	// * Hovered event title for tooltip styling.
	hoveredEvent = signal<string | null>(null);

	// * Weekday labels for header row.
	weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

	onDayClick(day: CalendarDay): void {
		this.dayClick.emit(day);
	}

	onDayHover(day: CalendarDay, isHovering: boolean): void {
		// * Only show tooltip for ranged events.
		if (!isHovering) {
			this.hoveredEvent.set(null);
			return;
		}

		const eventTitle = day.event?.endDate ? day.event.title : day.rangeEvent?.title;
		if (eventTitle) {
			this.hoveredEvent.set(eventTitle);
		}
	}

	trackByDay(index: number, _day: CalendarDay): number {
		return index;
	}
}
