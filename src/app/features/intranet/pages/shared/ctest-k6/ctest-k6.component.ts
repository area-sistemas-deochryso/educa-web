import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Stepper } from 'primeng/stepper';
import { StepList } from 'primeng/stepper';
import { Step } from 'primeng/stepper';
import { StepPanels } from 'primeng/stepper';
import { StepPanel } from 'primeng/stepper';

import { CTestK6Facade } from './services/ctest-k6.facade';
import { CTestK6Store } from './services/ctest-k6.store';
import { CredentialsDialogComponent } from './components/credentials-dialog/credentials-dialog.component';
import { ScriptOutputComponent } from './components/script-output/script-output.component';
import { LoadProfileComponent } from './components/load-profile/load-profile.component';
import { CTestConfigStepComponent } from './components/ctest-config-step/ctest-config-step.component';
import { CTestStagesStepComponent } from './components/ctest-stages-step/ctest-stages-step.component';
import { CTestEndpointsStepComponent } from './components/ctest-endpoints-step/ctest-endpoints-step.component';

@Component({
	selector: 'app-ctest-k6',
	standalone: true,
	imports: [
		ButtonModule,
		TagModule,
		TooltipModule,
		Stepper,
		StepList,
		Step,
		StepPanels,
		StepPanel,
		CredentialsDialogComponent,
		ScriptOutputComponent,
		LoadProfileComponent,
		CTestConfigStepComponent,
		CTestStagesStepComponent,
		CTestEndpointsStepComponent,
	],
	templateUrl: './ctest-k6.component.html',
	styleUrl: './ctest-k6.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CTestK6Component {
	// #region Dependencias
	private readonly facade = inject(CTestK6Facade);
	private readonly store = inject(CTestK6Store);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	readonly generatedScript = this.facade.generatedScript;
	// #endregion

	// #region Estado local — Wizard
	readonly activeStep = signal(0);
	readonly scriptGenerated = signal(false);
	// #endregion

	// #region Event handlers — Credenciales
	onOpenCredentials(): void {
		this.facade.openCredentialsDialog();
	}

	onCredentialsVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeCredentialsDialog();
		}
	}

	onTestLogin(event: { dni: string; password: string; rol: string; endpoint: string }): void {
		this.facade.testLogin(event.dni, event.password, event.rol, event.endpoint);
	}

	onRemoveCredential(usuario: string): void {
		this.store.removeCredential(usuario);
	}

	onImportBulkCredentials(text: string): void {
		this.facade.importBulkCredentials(text);
	}

	onClearAllCredentials(): void {
		this.facade.clearAllCredentials();
	}

	onUpdateRoleVUs(event: { rol: string; vus: number }): void {
		this.store.updateRoleVUs(event.rol, event.vus);
	}

	onApplyPresetDistribution(): void {
		this.facade.applyPresetDistribution();
	}

	onClearBulkResult(): void {
		this.facade.clearBulkImportResult();
	}
	// #endregion

	// #region Event handlers — Output
	onCopyScript(): void {
		this.facade.copyToClipboard();
	}

	onDownloadScript(): void {
		this.facade.downloadScript();
	}
	// #endregion

	// #region Event handlers — Wizard
	goToStep(step: number): void {
		this.activeStep.set(step);
	}

	onGenerateScript(): void {
		this.scriptGenerated.set(true);
		this.activeStep.set(4);
	}
	// #endregion
}
