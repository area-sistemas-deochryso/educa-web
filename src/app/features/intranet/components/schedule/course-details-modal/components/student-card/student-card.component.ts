import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-student-card',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './student-card.component.html',
	styleUrl: './student-card.component.scss',
})
export class StudentCardComponent {
	@Input() lastName = '';
	@Input() firstName = '';

	get formattedName(): string {
		return `${this.lastName}<br />${this.firstName}`;
	}
}
