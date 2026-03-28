import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop } from '@shared/directives/drag-drop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

import { CTestK6Store } from '../../services/ctest-k6.store';
import { CTestK6Facade } from '../../services/ctest-k6.facade';

@Component({
	selector: 'app-ctest-stages-step',
	standalone: true,
	imports: [
		FormsModule,
		CdkDropList,
		CdkDrag,
		CdkDragHandle,
		ButtonModule,
		InputTextModule,
		InputNumberModule,
		CheckboxModule,
		TooltipModule,
	],
	templateUrl: './ctest-stages-step.component.html',
	styleUrl: './ctest-stages-step.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CTestStagesStepComponent {
	// #region Dependencias
	private readonly store = inject(CTestK6Store);
	private readonly facade = inject(CTestK6Facade);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Estado local
	/** Índice del stage con panel de endpoints expandido (-1 = ninguno) */
	readonly expandedStageIndex = signal(-1);
	// #endregion

	// #region Outputs
	readonly goNext = output<void>();
	readonly goPrev = output<void>();
	// #endregion

	// #region Event handlers
	onUseStagesChange(value: boolean): void {
		this.store.updateConfigField('useStages', value);
	}

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

	onGoNext(): void {
		this.goNext.emit();
	}

	onGoPrev(): void {
		this.goPrev.emit();
	}
	// #endregion
}
