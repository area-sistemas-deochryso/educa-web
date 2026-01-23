import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-course-search',
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
		<div class="course-search-section">
			<p><strong>Cursos:</strong></p>
			<div class="course-search-box">
				<input
					type="text"
					[placeholder]="placeholder"
					[ngModel]="searchTerm"
					(ngModelChange)="searchTermChange.emit($event)"
					(input)="search.emit()"
					(blur)="blur.emit()"
				/>
				@if (showDropdown && results.length > 0) {
					<div class="course-dropdown">
						@for (course of results; track course) {
							<div class="course-option" (mousedown)="select.emit(course)">
								{{ course }}
							</div>
						}
					</div>
				}
			</div>
		</div>
	`,
	styles: `
		.course-search-section {
			margin-bottom: 1rem;

			p {
				margin: 0 0 0.25rem 0;
				font-size: 0.8rem;
				color: var(--intranet-default-text-color);
			}
		}

		.course-search-box {
			position: relative;

			input {
				width: 100%;
				padding: 0.4rem 0.6rem;
				border: 1px solid #ddd;
				border-radius: 4px;
				font-size: 0.75rem;
				color: var(--intranet-default-text-color);
				outline: none;
				box-sizing: border-box;

				&:focus {
					border-color: var(--intranet-accent-color-blue);
				}

				&::placeholder {
					color: var(--intranet-soft-text-color);
				}
			}
		}

		.course-dropdown {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: #ffffff;
			border: 1px solid #ddd;
			border-top: none;
			border-radius: 0 0 4px 4px;
			z-index: 10;
			max-height: 150px;
			overflow-y: auto;
		}

		.course-option {
			padding: 0.5rem 0.6rem;
			font-size: 0.75rem;
			color: var(--intranet-default-text-color);
			cursor: pointer;

			&:hover {
				background-color: rgba(0, 0, 0, 0.05);
			}
		}
	`,
})
export class CourseSearchComponent {
	@Input() searchTerm = '';
	@Input() placeholder = 'Ingrese nombre curso';
	@Input() results: string[] = [];
	@Input() showDropdown = false;
	@Output() searchTermChange = new EventEmitter<string>();
	@Output() search = new EventEmitter<void>();
	@Output() blur = new EventEmitter<void>();
	@Output() select = new EventEmitter<string>();
}
