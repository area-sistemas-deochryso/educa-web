import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SidebarLink {
	label: string;
	action: string;
}

@Component({
	selector: 'app-sidebar-links',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="sidebar-links-section">
			@if (title) {
				<p>
					<strong>{{ title }}</strong>
				</p>
			}
			@for (link of links; track link.action) {
				<p class="link" (click)="linkClick.emit(link.action)">{{ link.label }}</p>
			}
		</div>
	`,
	styles: `
		.sidebar-links-section {
			margin-bottom: 1rem;

			p {
				margin: 0 0 0.25rem 0;
				font-size: 0.8rem;
				color: var(--intranet-default-text-color);

				&.link {
					color: var(--intranet-soft-text-color);
					text-decoration: underline;
					cursor: pointer;
					margin-left: 0.5rem;

					&:hover {
						color: var(--intranet-accent-color-blue);
					}
				}
			}
		}
	`,
})
export class SidebarLinksComponent {
	@Input() title = '';
	@Input() links: SidebarLink[] = [];
	@Output() linkClick = new EventEmitter<string>();
}
