import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AsistenciaCursoResumenDto } from '@features/intranet/pages/profesor/models';

@Component({
	selector: 'app-attendance-summary-panel',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, DatePickerModule, TableModule, TagModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './attendance-summary-panel.component.html',
	styleUrl: './attendance-summary-panel.component.scss',
})
export class AttendanceSummaryPanelComponent {
	// #region Inputs
	readonly resumen = input<AsistenciaCursoResumenDto | null>(null);
	readonly loading = input(false);
	// #endregion

	// #region Outputs
	readonly buscar = output<{ fechaInicio: string; fechaFin: string }>();
	// #endregion

	// #region Estado local
	fechaInicio: Date = this.getFirstDayOfMonth();
	fechaFin: Date = new Date();
	// #endregion

	// #region Computed
	readonly hasData = computed(() => {
		const r = this.resumen();
		return r !== null && r.estudiantes.length > 0;
	});

	readonly globalStats = computed(() => {
		const r = this.resumen();
		if (!r || r.estudiantes.length === 0) return null;
		const totP = r.estudiantes.reduce((s, e) => s + e.totalPresente, 0);
		const totT = r.estudiantes.reduce((s, e) => s + e.totalTarde, 0);
		const totF = r.estudiantes.reduce((s, e) => s + e.totalFalto, 0);
		const total = totP + totT + totF;
		return {
			totalClases: r.totalClases,
			presentes: totP,
			tardes: totT,
			faltas: totF,
			porcentaje: total > 0 ? ((totP / total) * 100).toFixed(1) : '0',
		};
	});
	// #endregion

	// #region Handlers
	onBuscar(): void {
		this.buscar.emit({
			fechaInicio: this.formatDate(this.fechaInicio),
			fechaFin: this.formatDate(this.fechaFin),
		});
	}
	// #endregion

	// #region Helpers
	getPorcentajeSeverity(pct: number): 'success' | 'warn' | 'danger' {
		if (pct >= 80) return 'success';
		if (pct >= 60) return 'warn';
		return 'danger';
	}

	private formatDate(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	private getFirstDayOfMonth(): Date {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1);
	}
	// #endregion
}
