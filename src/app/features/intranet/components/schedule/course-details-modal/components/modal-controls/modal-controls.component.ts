import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

@Component({
	selector: 'app-modal-controls',
	standalone: true,
	imports: [CommonModule, TooltipModule],
	template: `
		<div class="modal-controls">
			<button
				class="control-btn"
				(click)="expand.emit()"
				[pTooltip]="isExpanded ? 'Contraer' : 'Maximizar'"
				tooltipPosition="bottom"
			>
				<i
					class="pi"
					[class.pi-window-maximize]="!isExpanded"
					[class.pi-window-minimize]="isExpanded"
				></i>
			</button>
			<button
				class="control-btn close-btn"
				(click)="closeTriggered.emit()"
				pTooltip="Cerrar"
				tooltipPosition="bottom"
			>
				<i class="pi pi-times"></i>
			</button>
		</div>
	`,
	styles: `
		.modal-controls {
			display: flex;
			justify-content: flex-end;
			gap: 0.5rem;
			margin-bottom: 0.5rem;
		}

		.control-btn {
			width: 32px;
			height: 32px;
			border: 1px solid #ddd;
			border-radius: 4px;
			background: #fff;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;

			i {
				font-size: 0.9rem;
				color: var(--intranet-soft-text-color);
			}

			&:hover {
				background-color: rgba(0, 0, 0, 0.05);
				border-color: var(--intranet-accent-color-blue);

				i {
					color: var(--intranet-accent-color-blue);
				}
			}

			&.close-btn:hover {
				background-color: #fee2e2;
				border-color: #ef4444;

				i {
					color: #ef4444;
				}
			}
		}
	`,
})
export class ModalControlsComponent {
	@Input() isExpanded = false;
	@Output() expand = new EventEmitter<void>();
	@Output() closeTriggered = new EventEmitter<void>();
}
