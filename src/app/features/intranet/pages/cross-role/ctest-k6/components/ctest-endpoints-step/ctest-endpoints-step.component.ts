import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop } from '@intranet-shared/directives/drag-drop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';

import { CTestK6Store } from '../../services/ctest-k6.store';
import { CTestK6Facade } from '../../services/ctest-k6.facade';
import { HTTP_METHOD_OPTIONS, HttpMethod, K6Endpoint } from '../../models';

@Component({
	selector: 'app-ctest-endpoints-step',
	standalone: true,
	imports: [
		FormsModule,
		CdkDropList,
		CdkDrag,
		CdkDragHandle,
		ButtonModule,
		InputTextModule,
		SelectModule,
		CheckboxModule,
		TooltipModule,
		TextareaModule,
	],
	templateUrl: './ctest-endpoints-step.component.html',
	styleUrl: './ctest-endpoints-step.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CTestEndpointsStepComponent {
	// #region Dependencias
	private readonly store = inject(CTestK6Store);
	private readonly facade = inject(CTestK6Facade);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Opciones estáticas
	readonly httpMethodOptions = HTTP_METHOD_OPTIONS;
	// #endregion

	// #region Outputs
	readonly goNext = output<void>();
	readonly goPrev = output<void>();
	// #endregion

	// #region Event handlers
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

	onGoNext(): void {
		this.goNext.emit();
	}

	onGoPrev(): void {
		this.goPrev.emit();
	}
	// #endregion
}
