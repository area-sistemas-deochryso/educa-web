// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
export interface SidebarLink {
	label: string;
	action: string;
}

@Component({
	selector: 'app-sidebar-links',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [CommonModule],
	templateUrl: './sidebar-links.component.html',
	styleUrl: './sidebar-links.component.scss',
})
export class SidebarLinksComponent {
	// * Optional title + list of actions.
	@Input() title = '';
	@Input() links: SidebarLink[] = [];
	@Output() linkClick = new EventEmitter<string>();
}
// #endregion
