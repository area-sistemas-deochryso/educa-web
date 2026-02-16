// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	ContentChild,
	TemplateRef,
	effect,
	input,
	signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';

/**
 * Componente wrapper para lazy rendering con skeleton screens
 * Optimizado para Lighthouse Speed Index
 *
 * @example
 * ```html
 * <app-lazy-content [loading]="loading()" [minHeight]="420">
 *   <ng-template #skeleton>
 *     <app-my-skeleton />
 *   </ng-template>
 *   <ng-template #content>
 *     <p-table [value]="data()">...</p-table>
 *   </ng-template>
 * </app-lazy-content>
 * ```
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-lazy-content',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './lazy-content.component.html',
	styleUrls: ['./lazy-content.component.scss'],
})
export class LazyContentComponent {
	// * Inputs that control when skeleton vs content is shown.
	/** Estado de carga - controla cuándo mostrar skeleton vs contenido */
	readonly loading = input<boolean>(false);

	/** Altura mínima para reservar espacio y evitar CLS */
	readonly minHeight = input<number | undefined>(undefined);

	/** Delay antes de ocultar skeleton (asegura que el contenido esté renderizado) */
	readonly hideDelay = input<number>(50);

	/** Template del skeleton personalizado */
	@ContentChild('skeleton', { read: TemplateRef }) skeleton?: TemplateRef<unknown>;

	/** Template del contenido real */
	@ContentChild('content', { read: TemplateRef }) content?: TemplateRef<unknown>;

	// * Internal state for the skeleton visibility.
	protected readonly showSkeleton = signal(true);

	constructor() {
		// Effect: Controlar visibilidad del skeleton
		effect(() => {
			const isLoading = this.loading();

			if (isLoading) {
				// Mostrar skeleton inmediatamente
				this.showSkeleton.set(true);
			} else {
				// Ocultar skeleton con delay para asegurar renderizado
				setTimeout(() => {
					this.showSkeleton.set(false);
				}, this.hideDelay());
			}
		});
	}
}
// #endregion
