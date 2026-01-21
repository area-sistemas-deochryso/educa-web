import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

@Component({
	selector: 'app-attendance-header',
	standalone: true,
	imports: [CommonModule, TooltipModule],
	templateUrl: './attendance-header.component.html',
	styleUrl: './attendance-header.component.scss',
})
export class AttendanceHeaderComponent {
	loading = input<boolean>(false);
	reload = output<void>();

	onReload(): void {
		this.reload.emit();
	}
}
