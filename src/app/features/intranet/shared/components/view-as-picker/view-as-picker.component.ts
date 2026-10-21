// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	inject,
	input,
	output,
	signal,
	computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import type { UsuarioBusqueda } from '@core/services/permissions';
import {
	ViewAsContext,
	ViewAsFiltroOption,
	ViewAsFiltrosService,
	ViewAsRol,
	ViewAsSujetosService,
} from '@core/services/view-as';
import { PickerGridComponent } from '../picker-grid';
import { EduAutoComplete, EduTemplate } from '@edu-ui';
import type { EduAutoCompleteCompleteEvent } from '@edu-ui';
// #endregion

// #region Implementation
/**
 * User search + select for the "ver como" (P92 F2) flow. Reused as a
 * full-page picker (`ViewAsGateComponent`) and inside the "Cambiar" dialog
 * of `ViewAsBannerComponent` — same UI, same rol filter, per decision #3.
 *
 * Searches through `ViewAsSujetosService` (P115 F3), whose endpoint is gated by the "ver como"
 * capability alone — the previous Permisos-por-Usuario search required `PERMISOS_USUARIO_API_MANAGE`,
 * which a role that merely needs to pick whom to view must not hold. It also keeps this picker away
 * from `PermissionsUsersDataFacade`/`PermissionsUsersStore`, whose root-singleton state the admin
 * capabilities page reads.
 *
 * `p-autoComplete` uses `appendTo="body"` (brief 505) — inside the
 * "Cambiar" dialog, the overlay used to nest under the dialog's scrollable
 * content, so scrolling the dialog to reveal cut-off results auto-closed
 * the overlay before a result could be clicked. Anchoring to `body` matches
 * the two `p-select` filters above, which already did this.
 */
@Component({
	selector: 'app-view-as-picker',
	standalone: true,
	imports: [FormsModule, EduAutoComplete, EduTemplate, PickerGridComponent],
	templateUrl: './view-as-picker.component.html',
	styleUrl: './view-as-picker.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewAsPickerComponent implements OnInit {
	private readonly api = inject(ViewAsSujetosService);
	private readonly filtrosApi = inject(ViewAsFiltrosService);
	private readonly destroyRef = inject(DestroyRef);

	readonly rol = input.required<ViewAsRol>();
	readonly userSelected = output<ViewAsContext>();

	readonly suggestions = signal<UsuarioBusqueda[]>([]);
	readonly searching = signal(false);
	/**
	 * El overlay de resultados (appendTo="body") se abre hacia ARRIBA cuando
	 * no hay espacio debajo del input (brief 531 hallazgo 3) y tapa el panel
	 * de filtros que está justo encima en el layout. Se colapsa el panel
	 * mientras el overlay está abierto en vez de pelear con el z-index —
	 * PrimeNG recalcula la posición recién al mostrarse, así que ocultar el
	 * panel antes le deja más espacio debajo del input en el próximo open.
	 */
	readonly resultsOpen = signal(false);
	/** Local-only — reflects the current selection back into the input; never read by a parent. */
	readonly selectedUsuario = signal<UsuarioBusqueda | null>(null);

	/** Filtros complementarios — ninguno es obligatorio para elegir un usuario. */
	readonly salonOptions = signal<ViewAsFiltroOption[]>([]);
	readonly cursoOptions = signal<ViewAsFiltroOption[]>([]);
	readonly selectedSalonId = signal<number | null>(null);
	readonly selectedCursoId = signal<number | null>(null);

	/** Recordado para reaplicar el mismo texto libre cuando cambia un filtro. */
	private lastTermino: string | undefined;

	readonly placeholder = computed(() =>
		this.rol() === 'Profesor' ? 'Buscar profesor por nombre o DNI...' : 'Buscar estudiante por nombre o DNI...',
	);

	ngOnInit(): void {
		this.filtrosApi
			.listarSalones()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((salones) => this.salonOptions.set(salones));

		this.filtrosApi
			.listarCursos()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((cursos) => this.cursoOptions.set(cursos));

		// Precarga: sin texto ni filtros, mostrar algunos resultados en vez de arrancar vacío.
		this.runSearch();
	}

	onSearch(event: EduAutoCompleteCompleteEvent): void {
		this.runSearch(event.query || undefined);
	}

	onFiltroChange(): void {
		this.runSearch(this.lastTermino);
	}

	private runSearch(termino?: string): void {
		this.lastTermino = termino;
		this.searching.set(true);
		this.api
			.buscar(this.rol(), termino, this.selectedSalonId() ?? undefined, this.selectedCursoId() ?? undefined)
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
