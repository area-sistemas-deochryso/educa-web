// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

// #endregion
// #region Implementation
@Component({
	selector: 'app-modal-controls',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule, TooltipModule],
	templateUrl: './modal-controls.component.html',
	styleUrls: ['./modal-controls.component.scss'],
})
/**
 * Control buttons for expanding and closing the modal.
 */
export class ModalControlsComponent {
	// #region Inputs/Outputs
	/** True when the modal is in expanded mode. */
	@Input() isExpanded = false;
	/** Emits when the expand toggle is clicked. */
	@Output() expand = new EventEmitter<void>();
	/** Emits when the close action is clicked. */
	@Output() closeTriggered = new EventEmitter<void>();
	// #endregion
}
// #endregion
