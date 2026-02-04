import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-week-search-box',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './week-search-box.component.html',
	styleUrls: ['./week-search-box.component.scss'],
})
export class WeekSearchBoxComponent {
	// * Two-way bound search term + placeholder override.
	@Input() searchTerm = '';
	@Input() placeholder = 'BUSCAR ARCHIVO, SEMANA O TEMA...';
	@Output() searchTermChange = new EventEmitter<string>();
}
