import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Evaluation {
	name: string;
	grade: number;
}

@Component({
	selector: 'app-evaluations-accordion',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="evaluations-section" [class.expanded]="expanded">
			<div class="eval-header" (click)="toggle.emit()">
				<span>EVALUACIONES</span>
				<i
					class="pi"
					[class.pi-chevron-down]="!expanded"
					[class.pi-chevron-up]="expanded"
				></i>
			</div>
			@if (expanded) {
				<div class="eval-content">
					<div class="eval-icon">
						<i class="pi pi-file"></i>
					</div>
					<div class="eval-list">
						@for (evaluation of evaluations; track evaluation.name) {
							<span>{{ evaluation.name }}</span>
						}
					</div>
				</div>
			}
		</div>
	`,
	styles: `
		.evaluations-section {
			border: 1px solid #ddd;
			border-radius: 4px;

			&:not(.expanded) .eval-header {
				border-bottom: none;
			}
		}

		.eval-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 0.5rem 1rem;
			font-size: 0.8rem;
			font-weight: 500;
			color: var(--intranet-default-text-color);
			cursor: pointer;
			border-bottom: 1px solid #ddd;

			i {
				font-size: 0.7rem;
				color: var(--intranet-soft-text-color);
			}
		}

		.eval-content {
			display: flex;
			padding: 1rem;
			gap: 1rem;
		}

		.eval-icon {
			width: 60px;
			height: 60px;
			border: 1px solid #ddd;
			border-radius: 4px;
			display: flex;
			align-items: center;
			justify-content: center;

			i {
				font-size: 1.5rem;
				color: var(--intranet-soft-text-color);
			}
		}

		.eval-list {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;

			span {
				font-size: 0.8rem;
				color: var(--intranet-default-text-color);
			}
		}
	`,
})
export class EvaluationsAccordionComponent {
	@Input() expanded = false;
	@Input() evaluations: Evaluation[] = [];
	@Output() toggle = new EventEmitter<void>();
}
