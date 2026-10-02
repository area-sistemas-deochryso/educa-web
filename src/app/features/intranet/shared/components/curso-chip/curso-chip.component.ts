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
	template: `<span class="curso-chip" [class.curso-chip--neutral]="color() === null" [style.background-color]="color()" [style.color]="color() ? textColor : null">{{ nombre() }}</span>`,
	styleUrl: './curso-chip.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursoChipComponent {
	private readonly theme = inject(ThemeService);

	/** `null`/`undefined` (DTO sin curso resuelto) → chip neutro sin color de curso. */
	readonly cursoId = input<number | null | undefined>(null);
	readonly nombre = input.required<string>();

	readonly textColor = CURSO_TEXT_COLOR;
	readonly color = computed(() => {
		const id = this.cursoId();
		return id == null ? null : cursoColorFor(id, this.theme.isDarkMode());
	});
}
// #endregion
