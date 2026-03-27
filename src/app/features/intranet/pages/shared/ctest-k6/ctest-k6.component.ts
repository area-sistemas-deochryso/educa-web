import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CdkDropList, CdkDrag, CdkDragDrop } from '@shared/directives/drag-drop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
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
import { TEST_TYPE_OPTIONS, HTTP_METHOD_OPTIONS, BASE_URL_OPTIONS } from './models';
import { TestType, HttpMethod, K6Endpoint } from './models';

@Component({
	selector: 'app-ctest-k6',
	standalone: true,
	imports: [
		FormsModule,
		CdkDropList,
		CdkDrag,
		ButtonModule,
		InputTextModule,
		InputNumberModule,
		SelectModule,
		CheckboxModule,
		TooltipModule,
		TagModule,
		TextareaModule,
		Stepper,
		StepList,
		Step,
		StepPanels,
		StepPanel,
		CredentialsDialogComponent,
		ScriptOutputComponent,
		LoadProfileComponent,
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

	// #region Opciones estáticas
	readonly testTypeOptions = TEST_TYPE_OPTIONS;
	readonly httpMethodOptions = HTTP_METHOD_OPTIONS;
	readonly baseUrlOptions = BASE_URL_OPTIONS;
	// #endregion

	// #region Event handlers — Configuración
	onTestNameChange(value: string): void {
		this.store.updateConfigField('testName', value);
	}

	onBaseUrlChange(value: string): void {
		this.store.setBaseUrl(value);
	}

	onTestTypeChange(value: TestType): void {
		this.facade.applyTestType(value);
	}

	onVusChange(value: number): void {
		this.store.updateConfigField('vus', value ?? 1);
	}

	onDurationChange(value: string): void {
		this.store.updateConfigField('duration', value);
	}

	onUseStagesChange(value: boolean): void {
		this.store.updateConfigField('useStages', value);
	}

	onP95Change(value: number): void {
		const current = this.vm().config.thresholds;
		this.store.updateConfigField('thresholds', { ...current, p95Latency: value ?? 2000 });
	}

	onErrorRateChange(value: number): void {
		const current = this.vm().config.thresholds;
		this.store.updateConfigField('thresholds', { ...current, errorRate: value ?? 1 });
	}
	// #endregion

	// #region Event handlers — Stages
	onAddStage(): void {
		this.store.addStage();
	}

	onRemoveStage(index: number): void {
		this.store.removeStage(index);
	}

	onStageDurationChange(index: number, value: string): void {
		this.store.updateStage(index, 'duration', value);
	}

	onStageTargetChange(index: number, value: number): void {
		this.store.updateStage(index, 'target', value ?? 0);
	}

	onDropStage(event: CdkDragDrop<unknown>): void {
		if (event.previousIndex !== event.currentIndex) {
			this.store.reorderStages(event.previousIndex, event.currentIndex);
		}
	}

	/** Índice del stage con panel de endpoints expandido (-1 = ninguno) */
	readonly expandedStageIndex = signal(-1);

	onToggleStageEndpoints(index: number): void {
		this.expandedStageIndex.update((curr) => (curr === index ? -1 : index));
	}

	onStageEndpointToggle(stageIndex: number, endpointIndex: number, checked: boolean): void {
		const stage = this.vm().config.stages[stageIndex];
		let indices = [...stage.endpointIndices];

		if (checked) {
			if (!indices.includes(endpointIndex)) indices.push(endpointIndex);
		} else {
			indices = indices.filter((i) => i !== endpointIndex);
		}
		this.store.updateStageEndpoints(stageIndex, indices);
	}

	isEndpointInStage(stageIndex: number, endpointIndex: number): boolean {
		const stage = this.vm().config.stages[stageIndex];
		return stage.endpointIndices.length === 0 || stage.endpointIndices.includes(endpointIndex);
	}

	stageEndpointCount(stageIndex: number): string {
		const stage = this.vm().config.stages[stageIndex];
		const enabledCount = this.vm().enabledEndpoints.length;
		if (stage.endpointIndices.length === 0) return `Todos (${enabledCount})`;
		return `${stage.endpointIndices.length}`;
	}
	// #endregion

	// #region Event handlers — Endpoints
	onLoadPresets(): void {
		this.facade.loadPresetEndpoints();
	}

	onAddEndpoint(): void {
		this.facade.addCustomEndpoint();
	}

	onRemoveEndpoint(index: number): void {
		this.store.removeEndpoint(index);
	}

	onToggleEndpoint(index: number): void {
		this.store.toggleEndpoint(index);
	}

	onEndpointMethodChange(index: number, method: HttpMethod): void {
		this.store.updateEndpoint(index, 'method', method);
	}

	onEndpointPathChange(index: number, path: string): void {
		this.store.updateEndpoint(index, 'path', path);
	}

	onEndpointNameChange(index: number, name: string): void {
		this.store.updateEndpoint(index, 'name', name);
	}

	onEndpointBodyChange(index: number, body: string): void {
		this.store.updateEndpoint(index, 'body', body);
	}

	onToggleAllEndpoints(enabled: boolean): void {
		this.store.toggleAllEndpoints(enabled);
	}

	onDropEndpoint(event: CdkDragDrop<unknown>): void {
		if (event.previousIndex !== event.currentIndex) {
			this.store.reorderEndpoints(event.previousIndex, event.currentIndex);
		}
	}

	showBody(endpoint: K6Endpoint): boolean {
		return endpoint.method === 'POST' || endpoint.method === 'PUT';
	}
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
