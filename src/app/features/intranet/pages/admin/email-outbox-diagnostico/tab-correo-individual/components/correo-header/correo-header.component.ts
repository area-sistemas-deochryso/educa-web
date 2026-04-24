import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { PageHeaderComponent } from '@intranet-shared/components/page-header';

@Component({
	selector: 'app-correo-header',
	standalone: true,
	imports: [FormsModule, ButtonModule, InputTextModule, TooltipModule, PageHeaderComponent],
	templateUrl: './correo-header.component.html',
	styleUrl: './correo-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreoHeaderComponent {
	private errorHandler = inject(ErrorHandlerService);

	// #region Inputs / Outputs
	readonly correoInput = input<string>('');
	readonly correoConsultado = input<string | null>(null);
	readonly generatedAt = input<string | null>(null);
	readonly loading = input<boolean>(false);

	readonly correoInputChange = output<string>();
	readonly buscar = output<string>();
	readonly limpiar = output<void>();
	// #endregion

	// #region Computed
	readonly generatedAtLabel = computed(() => {
		const iso = this.generatedAt();
		if (!iso) return '';
		const diffMin = this.minutesSince(iso);
		if (diffMin === null) return '';
		if (diffMin < 1) return 'Consultado hace instantes';
		if (diffMin === 1) return 'Consultado hace 1 min';
		if (diffMin < 60) return `Consultado hace ${diffMin} min`;
		const hours = Math.floor(diffMin / 60);
		if (hours === 1) return 'Consultado hace 1 hora';
		if (hours < 24) return `Consultado hace ${hours} horas`;
		const days = Math.floor(hours / 24);
		return days === 1 ? 'Consultado hace 1 día' : `Consultado hace ${days} días`;
	});

	// * El eco solo se muestra cuando el BE normalizó el valor (trim + lower)
	// * y difiere del input original del admin — feedback de "el servidor limpió esto".
	readonly mostrarEcoNormalizado = computed(() => {
		const consultado = this.correoConsultado();
		const input = (this.correoInput() ?? '').trim().toLowerCase();
		return !!consultado && consultado !== input;
	});
	// #endregion

	// #region Handlers
	onInputChange(value: string): void {
		this.correoInputChange.emit(value);
	}

	onSubmit(): void {
		if (this.loading()) return;
		this.buscar.emit(this.correoInput() ?? '');
	}

	onLimpiar(): void {
		this.limpiar.emit();
	}

	async onCopyConsultado(): Promise<void> {
		const correo = this.correoConsultado();
		if (!correo) return;
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(correo);
			this.errorHandler.showSuccess(
				'Copiado',
				'Correo normalizado copiado al portapapeles',
				1500,
			);
		} catch {
			this.errorHandler.showError('Portapapeles', 'No se pudo copiar');
		}
	}
	// #endregion

	// #region Helpers
	private minutesSince(iso: string): number | null {
		const parsed = new Date(iso);
		if (Number.isNaN(parsed.getTime())) return null;
		const ms = Date.now() - parsed.getTime();
		if (ms < 0) return 0;
		return Math.floor(ms / 60_000);
	}
	// #endregion
}
