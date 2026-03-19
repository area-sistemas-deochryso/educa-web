import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CampusPisoDto } from '../../models';

@Component({
	selector: 'app-campus-pisos-panel',
	standalone: true,
	imports: [ButtonModule, TagModule, TooltipModule],
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
