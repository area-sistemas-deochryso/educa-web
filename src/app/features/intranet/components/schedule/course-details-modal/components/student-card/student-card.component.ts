import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-student-card',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="student-info">
			<div class="avatar-placeholder">
				<i class="pi pi-user"></i>
			</div>
			<span class="student-name" [innerHTML]="formattedName"></span>
		</div>
	`,
	styles: `
		.student-info {
			text-align: center;
			margin-bottom: 1.5rem;
		}

		.avatar-placeholder {
			width: 60px;
			height: 60px;
			border: 2px solid #ddd;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			margin: 0 auto 0.5rem;

			i {
				font-size: 1.5rem;
				color: var(--intranet-soft-text-color);
			}
		}

		.student-name {
			font-size: 0.85rem;
			font-weight: 500;
			color: var(--intranet-default-text-color);
			line-height: 1.3;
		}
	`,
})
export class StudentCardComponent {
	@Input() lastName = '';
	@Input() firstName = '';

	get formattedName(): string {
		return `${this.lastName}<br />${this.firstName}`;
	}
}
