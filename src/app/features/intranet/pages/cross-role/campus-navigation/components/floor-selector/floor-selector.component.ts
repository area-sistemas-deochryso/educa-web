// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { EduButton } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-floor-selector',
	standalone: true,
	imports: [EduButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="floor-selector">
			@for (floor of floors(); track floor) {
				<edu-button
					[label]="'Piso ' + floor"
					[outlined]="selectedFloor() !== floor"
					size="small"
					(click)="floorChange.emit(floor)"
					[pt]="{
						root: {
							'aria-label': 'Ver piso ' + floor,
						},
					}"
				/>
			}
		</div>
	`,
	styles: `
		.floor-selector {
			display: flex;
			gap: 0.5rem;
		}
	`,
})
export class FloorSelectorComponent {
	readonly floors = input.required<number[]>();
	readonly selectedFloor = input.required<number>();
	readonly floorChange = output<number>();
}
// #endregion
