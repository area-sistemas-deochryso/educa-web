import { TemplateRef, inject } from '@angular/core';

/**
 * Directiva para marcar fases de carga progresiva
 */
export class ProgressivePhaseDirective {
	// * Capture the projected template for a phase.
	public template = inject(TemplateRef<unknown>);
}
