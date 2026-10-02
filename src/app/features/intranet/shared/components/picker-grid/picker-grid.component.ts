// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '@core/services/theme';
import { EduInputText } from '@edu-ui';
import { cursoColorFor } from '@intranet-shared/config/curso-colors';

// #endregion

// #region Types
export interface PickerGridOption {
	value: number;
	label: string;
	sublabel?: string;
	/** Si viene, la card lleva una franja lateral con el color de ese curso. */
	cursoId?: number;
}
// #endregion

// #region Implementation
/**
 * Grilla buscable de cards, reemplaza un `p-select` cuando el usuario se
 * beneficia de reconocimiento visual (ver varias opciones a la vez) en vez
 * de abrir/tipear/confirmar un dropdown (redline P2, xrepo picker-grid).
 *
 * Dos modos de uso, mismo componente:
 * - `clearable=false` (default): la card elegida ES la selección final —
 *   patrón "seleccionar salón/curso antes de ver datos" (asistencia,
 *   calificaciones, foro, permisos-salud, notas).
 * - `clearable=true`: la card actúa como filtro auxiliar de otra selección
 *   (ej: `ViewAsPickerComponent` busca una persona; salón/curso solo acotan
 *   la búsqueda) — click en la card ya elegida la deselecciona.
 */
@Component({
	selector: 'app-picker-grid',
	standalone: true,
	imports: [FormsModule, EduInputText],
	templateUrl: './picker-grid.component.html',
	styleUrl: './picker-grid.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickerGridComponent {
	private readonly theme = inject(ThemeService);

	readonly options = input.required<PickerGridOption[]>();
	readonly selected = input<number | null>(null);
	readonly searchPlaceholder = input('Buscar...');
	readonly emptyMessage = input('Sin resultados');
	readonly ariaLabel = input('');
	readonly clearable = input(false);
	/** Cap opcional para consumidores en espacios acotados (ej: dentro de un dialog). */
	readonly maxHeight = input<string | null>(null);
	readonly loading = input(false);
	readonly loadingMessage = input('Cargando...');

	readonly selectionChange = output<number | null>();

	readonly term = signal('');

	readonly filtered = computed(() => {
		const query = this.term().trim().toLowerCase();
		if (!query) return this.options();
		return this.options().filter(
			(option) =>
				option.label.toLowerCase().includes(query) || (option.sublabel?.toLowerCase().includes(query) ?? false),
		);
	});

	/** Lee `isDarkMode()` desde el template: la franja reacciona al toggle de tema. */
	accent(option: PickerGridOption): string | null {
		return option.cursoId === undefined ? null : cursoColorFor(option.cursoId, this.theme.isDarkMode());
	}

	isSelected(option: PickerGridOption): boolean {
		return this.selected() === option.value;
	}

	select(option: PickerGridOption): void {
		if (this.clearable() && this.isSelected(option)) {
			this.selectionChange.emit(null);
			return;
		}
		this.selectionChange.emit(option.value);
	}
}
// #endregion
