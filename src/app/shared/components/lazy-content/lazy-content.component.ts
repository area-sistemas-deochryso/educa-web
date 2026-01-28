import {
	ChangeDetectionStrategy,
	Component,
	ContentChild,
	input,
	signal,
	effect,
	TemplateRef,
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
@Component({
	selector: 'app-lazy-content',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="lazy-content" [style.min-height.px]="minHeight()">
			@if (showSkeleton()) {
				<!-- Skeleton phase -->
				<ng-container *ngTemplateOutlet="skeleton || defaultSkeleton" />
			} @else {
				<!-- Content phase -->
				<ng-container *ngTemplateOutlet="content || emptyContent" />
			}
		</div>

		<!-- Default skeleton si no se provee uno personalizado -->
		<ng-template #defaultSkeleton>
			<div class="lazy-content__default-skeleton">
				<div class="pulse"></div>
			</div>
		</ng-template>

		<!-- Empty content fallback -->
		<ng-template #emptyContent>
			<div class="lazy-content__empty">Sin contenido</div>
		</ng-template>
	`,
	styles: [
		`
			.lazy-content {
				position: relative;
				width: 100%;
			}

			.lazy-content__default-skeleton {
				width: 100%;
				height: 100%;
				min-height: inherit;
				background: var(--surface-100);
				border-radius: var(--border-radius);
				overflow: hidden;
			}

			.pulse {
				width: 100%;
				height: 100%;
				background: linear-gradient(
					90deg,
					transparent 0%,
					var(--surface-200) 50%,
					transparent 100%
				);
				animation: pulse 1.5s infinite;
				will-change: transform;
			}

			@keyframes pulse {
				0% {
					transform: translateX(-100%);
				}
				100% {
					transform: translateX(100%);
				}
			}

			.lazy-content__empty {
				padding: 2rem;
				text-align: center;
				color: var(--text-color-secondary);
			}
		`,
	],
})
export class LazyContentComponent {
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

	// Estado interno
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
