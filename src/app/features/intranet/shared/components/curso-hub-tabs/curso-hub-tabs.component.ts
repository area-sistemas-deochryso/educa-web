import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { CursoHubRol } from '../../helpers/curso-hub-link.helpers';

export interface CursoHubTab {
	/** Segmento de la ruta hija, relativo al shell (ej. `contenido`). */
	path: string;
	label: string;
	icon: string;
	/** Roles que ya tienen esta pestaña implementada (una ruta hija existe solo para ellos). */
	roles: readonly CursoHubRol[];
}

/** Pestañas del hub. F4 agrega Salón. */
export const CURSO_HUB_TABS: readonly CursoHubTab[] = [
	{ path: 'contenido', label: 'Contenido', icon: 'pi pi-book', roles: ['profesor', 'estudiante'] },
	{ path: 'calificaciones', label: 'Calificaciones', icon: 'pi pi-chart-bar', roles: ['profesor', 'estudiante'] },
	{ path: 'asistencia', label: 'Asistencia', icon: 'pi pi-check-square', roles: ['profesor', 'estudiante'] },
	{ path: 'informacion', label: 'Información', icon: 'pi pi-info-circle', roles: ['profesor', 'estudiante'] },
];

/** Pestañas visibles para un rol. */
export function cursoHubTabsFor(rol: CursoHubRol): readonly CursoHubTab[] {
	return CURSO_HUB_TABS.filter((tab) => tab.roles.includes(rol));
}

/**
 * Barra de pestañas del hub de curso. Cada pestaña es una ruta hija con URL
 * propia: navega con reemplazo de URL (no apila historial) y conserva el query
 * (`horarioId`) para que cambiar de pestaña no cambie de franja.
 */
@Component({
	selector: 'app-curso-hub-tabs',
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.hub-tabs {
			display: flex;
			gap: 0.25rem;
			padding: 0 1rem;
			border-bottom: 1px solid var(--surface-200);
			overflow-x: auto;
		}
		.hub-tab {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.75rem 1rem;
			font-weight: 600;
			font-size: 0.875rem;
			color: var(--text-color-secondary);
			text-decoration: none;
			white-space: nowrap;
			border-bottom: 2px solid transparent;
			margin-bottom: -1px;
		}
		.hub-tab:hover {
			color: var(--text-color);
		}
		.hub-tab.is-active {
			color: var(--primary-accent);
			border-bottom-color: var(--primary-accent);
		}
	`,
	template: `
		<nav class="hub-tabs" aria-label="Secciones del curso" data-info-anchor="curso-hub-tabs">
			@for (tab of tabs(); track tab.path) {
				<a
					class="hub-tab"
					[routerLink]="tab.path"
					queryParamsHandling="merge"
					[replaceUrl]="true"
					routerLinkActive="is-active"
					ariaCurrentWhenActive="page"
				>
					<i [class]="tab.icon"></i>
					{{ tab.label }}
				</a>
			}
		</nav>
	`,
})
export class CursoHubTabsComponent {
	readonly tabs = input<readonly CursoHubTab[]>(CURSO_HUB_TABS);
}
