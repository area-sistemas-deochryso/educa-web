import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CampusPisoDto } from '../../models';
import { EduButton, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-campus-pisos-panel',
	standalone: true,
	imports: [EduButton, EduTag, EduTooltip],
	templateUrl: './campus-pisos-panel.component.html',
	styleUrl: './campus-pisos-panel.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusPisosPanelComponent {
	// #region Inputs / Outputs

	readonly pisos = input.required<CampusPisoDto[]>();
	readonly selectedPisoId = input<number | null>(null);
	readonly loading = input(false);

	readonly selectPiso = output<number>();
	readonly createPiso = output<void>();
	readonly editPiso = output<CampusPisoDto>();
	readonly toggleEstadoPiso = output<number>();

	// #endregion
}
