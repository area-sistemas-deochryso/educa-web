// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '@core/services/theme';
import { CURSO_TEXT_COLOR, cursoColorFor } from '@intranet-shared/config/curso-colors';
// #endregion

// #region Implementation
/**
 * Chip con el nombre del curso sobre su color (relleno + texto blanco).
 * El color sale solo de `cursoId` (mismo curso, mismo color en todos los roles)
 * y reacciona al toggle de tema porque lee `isDarkMode()` dentro de un `computed`.
 * El rol va en borde/ícono, nunca en el relleno (regla compartida con brief 746).
 */
@Component({
	selector: 'app-curso-chip',
	standalone: true,
	template: `<span class="curso-chip" [style.background-color]="color()" [style.color]="textColor">{{ nombre() }}</span>`,
	styleUrl: './curso-chip.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursoChipComponent {
	private readonly theme = inject(ThemeService);

	readonly cursoId = input.required<number>();
	readonly nombre = input.required<string>();

	readonly textColor = CURSO_TEXT_COLOR;
	readonly color = computed(() => cursoColorFor(this.cursoId(), this.theme.isDarkMode()));
}
// #endregion
