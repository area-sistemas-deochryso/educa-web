import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-week-search-box',
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
		<div class="search-box">
			<i class="pi pi-search"></i>
			<input
				type="text"
				[placeholder]="placeholder"
				[ngModel]="searchTerm"
				(ngModelChange)="searchTermChange.emit($event)"
			/>
		</div>
	`,
	styles: `
		.search-box {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			border: 1px solid #ddd;
			border-radius: 4px;
			margin-bottom: 1rem;

			i {
				color: var(--intranet-soft-text-color);
				font-size: 0.85rem;
			}

			input {
				border: none;
				outline: none;
				font-size: 0.75rem;
				color: var(--intranet-soft-text-color);
				width: 100%;

				&::placeholder {
					color: var(--intranet-soft-text-color);
				}
			}
		}
	`,
})
export class WeekSearchBoxComponent {
	@Input() searchTerm = '';
	@Input() placeholder = 'BUSCAR ARCHIVO, SEMANA O TEMA...';
	@Output() searchTermChange = new EventEmitter<string>();
}
