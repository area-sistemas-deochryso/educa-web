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
	month = input.required<CalendarMonth>();

	dayClick = output<CalendarDay>();

	hoveredEvent = signal<string | null>(null);

	weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

	onDayClick(day: CalendarDay): void {
		this.dayClick.emit(day);
	}

	onDayHover(day: CalendarDay, isHovering: boolean): void {
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
