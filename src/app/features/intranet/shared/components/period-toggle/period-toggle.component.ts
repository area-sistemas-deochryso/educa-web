import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectButtonModule } from 'primeng/selectbutton';

import { esVerano, periodoActual } from '@shared/models';

@Component({
	selector: 'app-period-toggle',
	standalone: true,
	imports: [FormsModule, SelectButtonModule],
	template: `
		<p-selectButton
			[options]="options"
			[ngModel]="value()"
			(ngModelChange)="value.set($event)"
			optionLabel="label"
			optionValue="value"
			[allowEmpty]="false"
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodToggleComponent {
	readonly value = model(esVerano(periodoActual()));

	readonly options = [
		{ label: 'Regular', value: false },
		{ label: 'Verano', value: true },
	];
}
