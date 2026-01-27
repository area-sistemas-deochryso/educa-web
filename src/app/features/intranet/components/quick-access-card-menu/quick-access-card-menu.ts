import { ChangeDetectionStrategy, Component, computed, inject, input, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

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

	/** Texto visible en la tarjeta */
	label = input.required<string>();

	/** Ruta de redirección */
	path = input.required<string>();

	/** Modal a abrir en la página destino */
	modal = input.required<string>();

	/** Icono de PrimeNG a mostrar */
	icon = input<string>('pi-link');

	/** Lista de cursos disponibles */
	courses = input.required<string[]>();

	readonly menuItems = computed<MenuItem[]>(() =>
		this.courses().map((course) => ({
			label: course,
			command: () => this.navigateToCourse(course),
		}))
	);

	onCardClick(event: Event): void {
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
