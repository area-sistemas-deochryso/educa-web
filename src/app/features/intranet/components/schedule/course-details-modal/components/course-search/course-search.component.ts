import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-course-search',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './course-search.component.html',
	styleUrls: ['./course-search.component.scss'],
})
export class CourseSearchComponent {
	@Input() searchTerm = '';
	@Input() placeholder = 'Ingrese nombre curso';
	@Input() results: string[] = [];
	@Input() showDropdown = false;
	@Output() searchTermChange = new EventEmitter<string>();
	@Output() searchTriggered = new EventEmitter<void>();
	@Output() blurTriggered = new EventEmitter<void>();
	@Output() selectTriggered = new EventEmitter<string>();
}
