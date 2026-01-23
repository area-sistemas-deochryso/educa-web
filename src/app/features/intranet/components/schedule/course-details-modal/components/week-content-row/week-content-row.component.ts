import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-week-content-row',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="week-item-row">
			<div class="item-icon">
				<i class="pi" [ngClass]="icon"></i>
			</div>
			<div class="item-info">
				<strong>{{ title }}</strong>
				<span>{{ subtitle }}</span>
				<a class="item-link" (click)="action.emit()">{{ actionLabel }}</a>
			</div>
		</div>
	`,
	styles: `
		.week-item-row {
			display: flex;
			gap: 0.75rem;
			padding: 0.5rem 0;
			border-bottom: 1px solid #eee;

			&:last-child {
				border-bottom: none;
			}
		}

		.item-icon {
			width: 36px;
			height: 36px;
			border: 1px solid #ddd;
			border-radius: 4px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;

			i {
				font-size: 1rem;
				color: var(--intranet-soft-text-color);
			}
		}

		.item-info {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;

			strong {
				font-size: 0.75rem;
				color: var(--intranet-default-text-color);
			}

			span {
				font-size: 0.7rem;
				color: var(--intranet-soft-text-color);
			}
		}

		.item-link {
			font-size: 0.7rem;
			color: var(--intranet-accent-color-blue);
			text-decoration: underline;
			cursor: pointer;

			&:hover {
				color: var(--intranet-accent-color-green);
			}
		}
	`,
})
export class WeekContentRowComponent {
	@Input() icon = 'pi-file';
	@Input() title = '';
	@Input() subtitle = '';
	@Input() actionLabel = 'Ver';
	@Output() action = new EventEmitter<void>();
}
