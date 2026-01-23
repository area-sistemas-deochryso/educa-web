import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

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
	reload = output<void>();

	onReload(): void {
		this.reload.emit();
	}
}
