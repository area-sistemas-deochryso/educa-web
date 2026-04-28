import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { PageHeaderComponent } from '@intranet-shared/components/page-header';

import { PersonaConCorreoDto, TipoPersona } from '../../models/correo-individual.models';
import { CampoCorreoLabelPipe } from '../../pipes/campo-correo-label.pipe';

const TIPO_PERSONA_LABEL: Record<TipoPersona, string> = {
	E: 'Estudiante',
	P: 'Profesor',
	D: 'Director',
	APO: 'Apoderado',
};

const TIPO_PERSONA_ICON: Record<TipoPersona, string> = {
	E: 'pi pi-graduation-cap',
	P: 'pi pi-book',
	D: 'pi pi-shield',
	APO: 'pi pi-users',
};

@Component({
	selector: 'app-correo-header',
	standalone: true,
	imports: [
		FormsModule,
		AutoCompleteModule,
		ButtonModule,
		TooltipModule,
		PageHeaderComponent,
		CampoCorreoLabelPipe,
	],
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
	readonly sugerencias = input<PersonaConCorreoDto[]>([]);
	readonly loadingSugerencias = input<boolean>(false);
	readonly sugerenciasTotal = input<number>(0);

	readonly correoInputChange = output<string>();
	readonly buscar = output<string>();
	readonly limpiar = output<void>();
	readonly typeaheadQuery = output<string>();
	readonly seleccionarPersona = output<PersonaConCorreoDto>();
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

	readonly mostrarRefiname = computed(() => this.sugerenciasTotal() >= 10);
	// #endregion

	// #region Handlers — typeahead
	// * El input del p-autoComplete acepta string libre o PersonaConCorreoDto al seleccionar.
	// * Mantenemos en el ngModel un string siempre — al seleccionar emitimos via (onSelect).
	onComplete(event: AutoCompleteCompleteEvent): void {
		this.typeaheadQuery.emit(event.query ?? '');
	}

	onModelChange(value: string | PersonaConCorreoDto): void {
		// * PrimeNG llama (ngModelChange) con el string mientras tipeás y con el objeto al seleccionar.
		// * El (onSelect) handler ya emite seleccionarPersona, así que acá solo nos importa el string.
		if (typeof value === 'string') {
			this.correoInputChange.emit(value);
		}
	}

	onSelect(event: AutoCompleteSelectEvent): void {
		const persona = event.value as PersonaConCorreoDto;
		this.seleccionarPersona.emit(persona);
	}
	// #endregion

	// #region Handlers — submit / limpiar
	onSubmit(): void {
		if (this.loading()) return;
		const valor = this.correoInput() ?? '';
		const trimmed = valor.trim();
		if (!trimmed) return;
		this.buscar.emit(trimmed);
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
	tipoPersonaLabel(tipo: TipoPersona): string {
		return TIPO_PERSONA_LABEL[tipo] ?? tipo;
	}

	tipoPersonaIcon(tipo: TipoPersona): string {
		return TIPO_PERSONA_ICON[tipo] ?? 'pi pi-user';
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
