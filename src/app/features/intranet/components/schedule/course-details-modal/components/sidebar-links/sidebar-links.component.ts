// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
/**
 * Sidebar link item.
 */
export interface SidebarLink {
	/** Text shown for the link. */
	label: string;
	/** Action id emitted on click. */
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
/**
 * List of sidebar links with an optional title.
 */
export class SidebarLinksComponent {
	// #region Inputs/Outputs
	/** Optional title displayed above the links. */
	@Input() title = '';
	/** Link list to render. */
	@Input() links: SidebarLink[] = [];
	/** Emits the action id for a clicked link. */
	@Output() linkClick = new EventEmitter<string>();
	// #endregion
}
// #endregion
