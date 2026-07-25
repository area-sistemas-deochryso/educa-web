// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Step, StepList, StepPanel, StepPanels, Stepper } from 'primeng/stepper';

import { FaqWizardDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
// #endregion

/**
 * Wizard embebido de una FAQ puntual — se abre como diálogo modal desde el
 * botón "ir→" de `FaqListComponent`, nunca como ruta propia (el wizard no es
 * una sección del menú, ver `xrepo-panel-ayuda-intranet` § Decisiones).
 * Mismo componente `p-stepper` que `CTestK6Component`.
 */
@Component({
	selector: 'app-faq-wizard-dialog',
	standalone: true,
	imports: [ButtonModule, DialogModule, Stepper, StepList, Step, StepPanels, StepPanel],
	templateUrl: './faq-wizard-dialog.component.html',
	styleUrl: './faq-wizard-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqWizardDialogComponent {
	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly wizard = input<FaqWizardDto | null>(null);
	readonly visibleChange = output<boolean>();
	// #endregion

	// #region State
	readonly activeStep = signal(0);

	readonly pasos = computed(() => this.wizard()?.pasos ?? []);
	readonly isLastStep = computed(() => this.activeStep() >= this.pasos().length - 1);
	// #endregion

	// #region Handlers
	goToStep(step: number): void {
		const max = this.pasos().length - 1;
		this.activeStep.set(Math.max(0, Math.min(step, max)));
	}

	onHide(): void {
		this.activeStep.set(0);
		this.visibleChange.emit(false);
	}
	// #endregion
}
