import {
	ChangeDetectionStrategy,
	Component,
	ContentChildren,
	QueryList,
	TemplateRef,
	input,
	computed,
	signal,
	effect,
	inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Directiva para marcar fases de carga progresiva
 */
export class ProgressivePhaseDirective {
	// * Capture the projected template for a phase.
	public template = inject(TemplateRef<unknown>);
}

/**
 * Componente para renderizado progresivo multi-fase
 * Útil cuando hay múltiples secciones que cargan en secuencia
 *
 * @example
 * ```html
 * <app-progressive-loader [phases]="['stats', 'filters', 'table']" [currentPhase]="currentPhase()">
 *   <ng-template phase="stats">
 *     <app-stats-skeleton />
 *   </ng-template>
 *   <ng-template phase="filters">
 *     <app-filters-skeleton />
 *   </ng-template>
 *   <ng-template phase="table">
 *     <app-table-skeleton />
 *   </ng-template>
 *
 *   <ng-template content="stats">
 *     <app-stats [data]="stats()" />
 *   </ng-template>
 *   <ng-template content="filters">
 *     <app-filters [options]="filterOptions()" />
 *   </ng-template>
 *   <ng-template content="table">
 *     <p-table [value]="data()" />
 *   </ng-template>
 * </app-progressive-loader>
 * ```
 */
@Component({
	selector: 'app-progressive-loader',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './progressive-loader.component.html',
	styleUrls: ['./progressive-loader.component.scss'],
})
export class ProgressiveLoaderComponent {
	// * Ordered list of phases to render.
	/** Lista de fases en orden de carga */
	readonly phases = input.required<string[]>();

	/** Fase actual (índice o nombre de fase) */
	readonly currentPhase = input<string | number>(0);

	// * Ready flags for each phase name.
	/** Estados de cada fase { phaseName: isReady } */
	readonly phaseStates = input<Record<string, boolean>>({});

	@ContentChildren(TemplateRef) templates?: QueryList<TemplateRef<unknown>>;

	protected isPhaseLoading(phase: string): boolean {
		const states = this.phaseStates();
		return !states[phase];
	}

	protected getSkeletonTemplate(phase: string): TemplateRef<unknown> | null {
		// ! Placeholder: resolve skeleton template for phase.
		// Lógica para encontrar el template de skeleton correspondiente
		return null; // Implementar según necesidad
	}

	protected getContentTemplate(phase: string): TemplateRef<unknown> | null {
		// ! Placeholder: resolve content template for phase.
		// Lógica para encontrar el template de contenido correspondiente
		return null; // Implementar según necesidad
	}
}
