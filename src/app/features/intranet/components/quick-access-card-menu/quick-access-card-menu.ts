// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// #endregion
// #region Implementation
@Component({
	selector: 'app-quick-access-card-menu',
	standalone: true,
	imports: [MenuModule],
	templateUrl: './quick-access-card-menu.html',
	styleUrl: './quick-access-card-menu.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAccessCardMenuComponent {
	private router = inject(Router);

	@ViewChild('coursesMenu') coursesMenu!: Menu;

	// * Visible label on the card.
	label = input.required<string>();

	// * Target route.
	path = input.required<string>();

	// * Modal name to open on target page.
	modal = input.required<string>();

	// * PrimeNG icon class.
	icon = input<string>('pi-link');

	// * Course list to populate the menu.
	courses = input.required<string[]>();

	readonly menuItems = computed<MenuItem[]>(() =>
		// * Map courses to menu items.
		this.courses().map((course) => ({
			label: course,
			command: () => this.navigateToCourse(course),
		}))
	);

	onCardClick(event: Event): void {
		// * Toggle the dropdown menu.
		this.coursesMenu.toggle(event);
	}

	private navigateToCourse(course: string): void {
		this.router.navigate([this.path()], {
			queryParams: {
				modal: this.modal(),
				course: course,
			},
		});
	}
}
// #endregion
