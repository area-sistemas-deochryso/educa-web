import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-member-list',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="member-list-section">
			<p>
				<strong>{{ title }}</strong>
			</p>
			@for (member of members; track member) {
				<div class="group-member">
					<i class="pi pi-user"></i>
					<span>{{ member }}</span>
				</div>
			}
		</div>
	`,
	styles: `
		.member-list-section {
			margin-bottom: 1rem;

			p {
				margin: 0 0 0.25rem 0;
				font-size: 0.8rem;
				color: var(--intranet-default-text-color);
			}
		}

		.group-member {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin-top: 0.5rem;

			i {
				font-size: 1rem;
				color: var(--intranet-soft-text-color);
			}

			span {
				font-size: 0.75rem;
				color: var(--intranet-default-text-color);
				line-height: 1.3;
			}
		}
	`,
})
export class MemberListComponent {
	@Input() title = '';
	@Input() members: string[] = [];
}
