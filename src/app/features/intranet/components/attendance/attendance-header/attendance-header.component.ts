// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

// #endregion
// #region Implementation
export const VIEW_MODE = {
	Mes: 'mes',
	Dia: 'dia',
} as const;

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

@Component({
	selector: 'app-attendance-header',
	standalone: true,
	imports: [TooltipModule],
	templateUrl: './attendance-header.component.html',
	styleUrl: './attendance-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHeaderComponent {
	// * Inputs are signals to keep OnPush updates minimal.
	loading = input<boolean>(false);
	showModeSelector = input<boolean>(false);
	selectedMode = input<ViewMode>(VIEW_MODE.Dia);
	// * Outputs bubble actions up to the page component.
	modeChange = output<ViewMode>();
	reload = output<void>();

	onReload(): void {
		// * Fire a reload request (parent decides what to do).
		this.reload.emit();
	}

	onModeSelect(mode: ViewMode): void {
		// * Emit view mode change (day/month).
		this.modeChange.emit(mode);
	}
}
// #endregion
