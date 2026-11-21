import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { getTimeStatus, type TimeStatus } from '@shared/utils';
import { EduTag } from '@edu-ui';

// #region Implementation
const STATUS_LABEL: Record<TimeStatus, string> = {
	upcoming: 'Próximo',
	ongoing: 'En curso',
	finished: 'Finalizado',
};

const STATUS_SEVERITY: Record<TimeStatus, 'info' | 'success' | 'secondary'> = {
	upcoming: 'info',
	ongoing: 'success',
	finished: 'secondary',
};

/** Chip Próximo / En curso / Finalizado. El texto lleva el significado; el color solo lo refuerza. */
@Component({
	selector: 'app-time-status-chip',
	standalone: true,
	imports: [EduTag],
	template: `<edu-tag [value]="label()" [severity]="severity()" />`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeStatusChipComponent {
	readonly start = input.required<string>();
	readonly end = input<string | null>(null);
	/** Solo para pruebas y vistas con fecha simulada; por defecto, hoy. */
	readonly today = input<string | Date | undefined>(undefined);

	/** Reemplaza el texto de algún estado (ej. 'ongoing' → 'Vigente' para vigencias). */
	readonly labels = input<Partial<Record<TimeStatus, string>>>({});

	readonly status = computed(() => getTimeStatus(this.start(), this.end(), this.today()));
	readonly label = computed(() => this.labels()[this.status()] ?? STATUS_LABEL[this.status()]);
	readonly severity = computed(() => STATUS_SEVERITY[this.status()]);
}
// #endregion
