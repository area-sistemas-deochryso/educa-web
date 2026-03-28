import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { CTestK6Store } from '../../services/ctest-k6.store';
import { CTestK6Facade } from '../../services/ctest-k6.facade';
import { TEST_TYPE_OPTIONS, BASE_URL_OPTIONS } from '../../models';
import { TestType } from '../../models';

@Component({
	selector: 'app-ctest-config-step',
	standalone: true,
	imports: [
		FormsModule,
		ButtonModule,
		InputTextModule,
		InputNumberModule,
		SelectModule,
		TooltipModule,
	],
	templateUrl: './ctest-config-step.component.html',
	styleUrl: './ctest-config-step.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CTestConfigStepComponent {
	// #region Dependencias
	private readonly store = inject(CTestK6Store);
	private readonly facade = inject(CTestK6Facade);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Opciones estáticas
	readonly testTypeOptions = TEST_TYPE_OPTIONS;
	readonly baseUrlOptions = BASE_URL_OPTIONS;
	// #endregion

	// #region Outputs
	readonly goNext = output<void>();
	readonly openCredentials = output<void>();
	// #endregion

	// #region Event handlers
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

	onP95Change(value: number): void {
		const current = this.vm().config.thresholds;
		this.store.updateConfigField('thresholds', { ...current, p95Latency: value ?? 2000 });
	}

	onErrorRateChange(value: number): void {
		const current = this.vm().config.thresholds;
		this.store.updateConfigField('thresholds', { ...current, errorRate: value ?? 1 });
	}

	onOpenCredentials(): void {
		this.openCredentials.emit();
	}

	onGoNext(): void {
		this.goNext.emit();
	}
	// #endregion
}
