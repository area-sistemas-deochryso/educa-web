import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { APP_USER_ROLE_LIST, AppUserRoleValue } from '@shared/constants';

import {
	RATE_LIMIT_POLICIES,
	RateLimitEventFiltro,
	RateLimitPolicy,
} from '../../models';

interface SelectOption<T> {
	label: string;
	value: T | null;
}

@Component({
	selector: 'app-rate-limit-filters',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		DatePickerModule,
		InputTextModule,
		SelectModule,
		ToggleSwitchModule,
		TooltipModule,
	],
	templateUrl: './rate-limit-filters.component.html',
	styleUrl: './rate-limit-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLimitFiltersComponent {
	// #region Inputs / Outputs
	readonly filter = input.required<RateLimitEventFiltro>();
	readonly filterChange = output<Partial<RateLimitEventFiltro>>();
	readonly clearFilters = output<void>();
	// #endregion

	// #region Opciones
	readonly rolOptions: SelectOption<AppUserRoleValue>[] = [
		{ label: 'Todos los roles', value: null },
		...APP_USER_ROLE_LIST.map((rol) => ({ label: rol, value: rol })),
	];

	readonly policyOptions: SelectOption<RateLimitPolicy>[] = [
		{ label: 'Todas', value: null },
		...RATE_LIMIT_POLICIES.map((p) => ({ label: p, value: p })),
	];
	// #endregion

	// #region Computed / helpers
	readonly endpointSearch = computed(() => this.filter().endpoint ?? '');
	readonly fechaRango = computed<Date[] | null>(() => {
		const { desde, hasta } = this.filter();
		if (!desde && !hasta) return null;
		return [desde ?? null, hasta ?? null].filter((d): d is Date => d !== null);
	});
	// #endregion

	// #region Event handlers
	onEndpointChange(value: string): void {
		this.filterChange.emit({ endpoint: value || undefined });
	}

	onRolChange(value: AppUserRoleValue | null): void {
		this.filterChange.emit({ rol: value });
	}

	onPolicyChange(value: RateLimitPolicy | null): void {
		this.filterChange.emit({ policy: value });
	}

	onSoloRechazadosChange(value: boolean): void {
		this.filterChange.emit({ soloRechazados: value });
	}

	onFechaRangoChange(value: Date[] | null): void {
		const desde = value?.[0] ?? null;
		const hasta = value?.[1] ?? null;
		this.filterChange.emit({ desde, hasta });
	}

	onClear(): void {
		this.clearFilters.emit();
	}
	// #endregion
}
