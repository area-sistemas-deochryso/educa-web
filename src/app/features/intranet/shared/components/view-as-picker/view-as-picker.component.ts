// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';

import { PermissionsService, UsuarioBusqueda } from '@core/services/permissions';
import { ViewAsContext, ViewAsRol } from '@core/services/view-as';
// #endregion

// #region Implementation
/**
 * User search + select for the "ver como" (P92 F2) flow. Reused as a
 * full-page picker (`ViewAsGateComponent`) and inside the "Cambiar" dialog
 * of `ViewAsBannerComponent` — same UI, same rol filter, per decision #3.
 *
 * Calls `PermissionsService.searchUsers()` directly rather than going
 * through `PermissionsUsersDataFacade`/`PermissionsUsersStore` (decision
 * #4 says reuse the search *mechanism*, not the whole Permisos y Usuarios
 * feature) — that facade's store is a root singleton shared with the
 * admin capabilities page; routing this picker through it would mutate
 * `usuariosSugeridos` state that page also reads, which is an unrelated
 * side effect this component has no business causing.
 */
@Component({
	selector: 'app-view-as-picker',
	standalone: true,
	imports: [FormsModule, AutoCompleteModule],
	templateUrl: './view-as-picker.component.html',
	styleUrl: './view-as-picker.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewAsPickerComponent {
	private readonly api = inject(PermissionsService);
	private readonly destroyRef = inject(DestroyRef);

	readonly rol = input.required<ViewAsRol>();
	readonly userSelected = output<ViewAsContext>();

	readonly suggestions = signal<UsuarioBusqueda[]>([]);
	readonly searching = signal(false);
	/** Local-only — reflects the current selection back into the input; never read by a parent. */
	readonly selectedUsuario = signal<UsuarioBusqueda | null>(null);

	readonly placeholder = computed(() =>
		this.rol() === 'Profesor' ? 'Buscar profesor por nombre o DNI...' : 'Buscar estudiante por nombre o DNI...',
	);

	onSearch(event: AutoCompleteCompleteEvent): void {
		this.searching.set(true);
		this.api
			.searchUsers(event.query || undefined, this.rol())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.suggestions.set(result.usuarios);
					this.searching.set(false);
				},
				error: () => {
					this.suggestions.set([]);
					this.searching.set(false);
				},
			});
	}

	onSelect(usuario: UsuarioBusqueda): void {
		this.selectedUsuario.set(usuario);
		this.userSelected.emit({
			entityId: usuario.id,
			rol: this.rol(),
			nombreCompleto: usuario.nombreCompleto,
		});
	}
}
// #endregion
