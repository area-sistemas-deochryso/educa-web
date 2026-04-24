import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '@intranet-shared/components/page-header';

const MAX_DAYS_BACK = 90;

@Component({
	selector: 'app-correos-dia-header',
	standalone: true,
	imports: [FormsModule, ButtonModule, DatePickerModule, TooltipModule, PageHeaderComponent],
	templateUrl: './correos-dia-header.component.html',
	styleUrl: './correos-dia-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreosDiaHeaderComponent {
	// #region Inputs / Outputs
	readonly fechaConsulta = input<string | null>(null);
	readonly generatedAt = input<string | null>(null);
	readonly loading = input<boolean>(false);

	readonly refresh = output<void>();
	readonly fechaChange = output<string | null>();
	// #endregion

	// #region Computed
	readonly maxDate = computed(() => new Date());

	readonly minDate = computed(() => {
		const d = new Date();
		d.setDate(d.getDate() - MAX_DAYS_BACK);
		return d;
	});

	readonly selectedDate = computed<Date | null>(() => {
		const iso = this.fechaConsulta();
		if (!iso) return null;
		const parts = iso.split('-');
		if (parts.length !== 3) return null;
		const year = Number(parts[0]);
		const month = Number(parts[1]);
		const day = Number(parts[2]);
		if (!year || !month || !day) return null;
		return new Date(year, month - 1, day);
	});

	readonly generatedAtLabel = computed(() => {
		const iso = this.generatedAt();
		if (!iso) return '';
		const diffMin = this.minutesSince(iso);
		if (diffMin === null) return '';
		if (diffMin < 1) return 'Actualizado hace instantes';
		if (diffMin === 1) return 'Actualizado hace 1 min';
		if (diffMin < 60) return `Actualizado hace ${diffMin} min`;
		const hours = Math.floor(diffMin / 60);
		if (hours === 1) return 'Actualizado hace 1 hora';
		if (hours < 24) return `Actualizado hace ${hours} horas`;
		const days = Math.floor(hours / 24);
		return days === 1 ? 'Actualizado hace 1 día' : `Actualizado hace ${days} días`;
	});
	// #endregion

	// #region Handlers
	onRefresh(): void {
		this.refresh.emit();
	}

	onDateChange(value: Date | null): void {
		if (!value) {
			this.fechaChange.emit(null);
			return;
		}
		this.fechaChange.emit(this.formatIso(value));
	}

	onClearDate(): void {
		this.fechaChange.emit(null);
	}
	// #endregion

	// #region Helpers
	private formatIso(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	private minutesSince(iso: string): number | null {
		const parsed = new Date(iso);
		if (Number.isNaN(parsed.getTime())) return null;
		const ms = Date.now() - parsed.getTime();
		if (ms < 0) return 0;
		return Math.floor(ms / 60_000);
	}
	// #endregion
}
