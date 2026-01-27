import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

@Component({
	selector: 'app-modal-controls',
	standalone: true,
	imports: [CommonModule, TooltipModule],
	templateUrl: './modal-controls.component.html',
	styleUrls: ['./modal-controls.component.scss'],
})
export class ModalControlsComponent {
	@Input() isExpanded = false;
	@Output() expand = new EventEmitter<void>();
	@Output() closeTriggered = new EventEmitter<void>();
}
