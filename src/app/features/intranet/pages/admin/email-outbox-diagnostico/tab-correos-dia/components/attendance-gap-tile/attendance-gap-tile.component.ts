import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ExcelService } from '@core/services/excel';

import { AttendanceGapRow } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/models/email-dashboard-dia.models';

interface SalonOption {
	id: number;
	nombre: string;
}

@Component({
	selector: 'app-attendance-gap-tile',
	standalone: true,
	imports: [FormsModule, ButtonModule, MultiSelectModule, TableModule, TagModule, TooltipModule],
	templateUrl: './attendance-gap-tile.component.html',
	styleUrl: './attendance-gap-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceGapTileComponent {
	private router = inject(Router);
	private excelService = inject(ExcelService);

	readonly data = input.required<AttendanceGapRow[]>();
	readonly isEmpty = computed(() => this.data().length === 0);

	// #region Salon filter
	readonly hasSalonData = computed(() => this.data().some((r) => r.salonId != null));

	readonly salonOptions = computed<SalonOption[]>(() => {
		const map = new Map<number, string>();
		for (const row of this.data()) {
			if (row.salonId != null && row.salonNombre != null) {
				map.set(row.salonId, row.salonNombre);
			}
		}
		return Array.from(map, ([id, nombre]) => ({ id, nombre })).sort((a, b) =>
			a.nombre.localeCompare(b.nombre),
		);
	});

	readonly selectedSalonIds = signal<number[]>([]);

	readonly filteredData = computed(() => {
		const selected = this.selectedSalonIds();
		if (selected.length === 0 || !this.hasSalonData()) return this.data();
		return this.data().filter((r) => r.salonId != null && selected.includes(r.salonId));
	});
	// #endregion

	// #region Helpers
	getEstadoLabel(row: AttendanceGapRow): string {
		if (row.outboxId != null && row.outboxEstado === 'FAILED') return 'FAILED';
		return 'No generado';
	}

	getEstadoSeverity(row: AttendanceGapRow): 'danger' | 'warn' {
		if (row.outboxId != null && row.outboxEstado === 'FAILED') return 'danger';
		return 'warn';
	}

	onStudentClick(event: Event, row: AttendanceGapRow): void {
		event.stopPropagation();
		if (row.estudianteId != null) {
			this.router.navigate(['/intranet/admin/monitoreo/correos/estudiante', row.estudianteId], {
				state: { alumno: row.alumno, grado: row.grado, salonNombre: row.salonNombre },
			});
		}
	}

	onRowClick(row: AttendanceGapRow): void {
		this.router.navigate(['/intranet/admin/email-outbox'], {
			queryParams: { destinatario: row.alumno },
		});
	}
	// #endregion

	// #region Export
	exportExcel(): void {
		const rows = this.filteredData();
		this.excelService.exportToXlsx({
			sheetName: 'Gap asistencias',
			fileName: 'asistencias-sin-correo.xlsx',
			columns: [
				{ header: 'Alumno', key: 'alumno', width: 30 },
				{ header: 'Grado', key: 'grado', width: 15 },
				{ header: 'Salón', key: 'salonNombre', width: 15 },
				{ header: 'Tipo', key: 'tipo', width: 12 },
				{ header: 'Hora registro', key: 'horaRegistro', width: 14 },
				{ header: 'Estado correo', key: 'estadoLabel', width: 14 },
			],
			data: rows.map((r) => ({
				alumno: r.alumno,
				grado: r.grado,
				salonNombre: r.salonNombre ?? '—',
				tipo: r.tipo,
				horaRegistro: r.horaRegistro,
				estadoLabel: this.getEstadoLabel(r),
			})),
		});
	}
	// #endregion
}
