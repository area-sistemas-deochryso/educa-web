import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AttendanceGapRow } from '../../models/email-dashboard-dia.models';

@Component({
	selector: 'app-attendance-gap-tile',
	standalone: true,
	imports: [TableModule, TagModule],
	templateUrl: './attendance-gap-tile.component.html',
	styleUrl: './attendance-gap-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceGapTileComponent {
	private router = inject(Router);

	readonly data = input.required<AttendanceGapRow[]>();
	readonly isEmpty = computed(() => this.data().length === 0);

	getEstadoLabel(row: AttendanceGapRow): string {
		if (row.outboxId != null && row.outboxEstado === 'FAILED') return 'FAILED';
		return 'No generado';
	}

	getEstadoSeverity(row: AttendanceGapRow): 'danger' | 'warn' {
		if (row.outboxId != null && row.outboxEstado === 'FAILED') return 'danger';
		return 'warn';
	}

	onRowClick(row: AttendanceGapRow): void {
		this.router.navigate(['/intranet/admin/email-outbox'], {
			queryParams: { destinatario: row.alumno },
		});
	}
}
