import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-calendar-header',
	imports: [FormsModule],
	templateUrl: './calendar-header.component.html',
	styleUrl: './calendar-header.component.scss',
})
export class CalendarHeaderComponent {
	// * Inputs/outputs for calendar navigation.
	currentYear = input.required<number>();

	goToToday = output<void>();
	goToYear = output<number>();

	// * Local input model for year search.
	searchYear = '';

	onGoToToday(): void {
		this.goToToday.emit();
	}

	onGoToYear(): void {
		// * Validate year before emitting.
		const year = parseInt(this.searchYear, 10);
		if (!isNaN(year) && year >= 1900 && year <= 2100) {
			this.goToYear.emit(year);
			this.searchYear = '';
		}
	}

	onSearchKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			this.onGoToYear();
		}
	}
}
