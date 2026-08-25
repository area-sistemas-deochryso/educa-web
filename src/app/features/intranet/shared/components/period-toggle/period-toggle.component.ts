import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { esVerano, periodoActual } from '@shared/models';
import { EduSelectButton } from '@edu-ui';

@Component({
	selector: 'app-period-toggle',
	standalone: true,
	imports: [FormsModule, EduSelectButton],
	template: `
		<edu-select-button
			data-info-anchor="period-toggle"
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
