import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';

@Component({
	selector: 'app-floor-selector',
	standalone: true,
	imports: [ButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="floor-selector">
			@for (floor of floors(); track floor) {
				<button
					pButton
					[label]="'Piso ' + floor"
					[class.p-button-outlined]="selectedFloor() !== floor"
					class="p-button-sm"
					(click)="floorChange.emit(floor)"
					[pt]="{
						root: {
							'aria-label': 'Ver piso ' + floor,
						},
					}"
				></button>
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
