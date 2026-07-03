import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { ActiveBlockingSessionDto } from '../../models/diagnostico-db.models';

@Component({
	selector: 'app-active-blocking-table',
	standalone: true,
	imports: [DecimalPipe, ButtonModule, TableModule, TooltipModule],
	templateUrl: './active-blocking-table.component.html',
	styleUrl: './active-blocking-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveBlockingTableComponent {
	readonly sessions = input<ActiveBlockingSessionDto[]>([]);
	readonly loading = input(false);
	readonly error = input<string | null>(null);

	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}
}
