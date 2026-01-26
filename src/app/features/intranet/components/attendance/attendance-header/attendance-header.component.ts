import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

export type ViewMode = 'mes' | 'dia';

@Component({
	selector: 'app-attendance-header',
	standalone: true,
	imports: [TooltipModule],
	templateUrl: './attendance-header.component.html',
	styleUrl: './attendance-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHeaderComponent {
	loading = input<boolean>(false);
	showModeSelector = input<boolean>(false);
	selectedMode = input<ViewMode>('mes');
	modeChange = output<ViewMode>();
	reload = output<void>();

	onReload(): void {
		this.reload.emit();
	}

	onModeSelect(mode: ViewMode): void {
		this.modeChange.emit(mode);
	}
}
