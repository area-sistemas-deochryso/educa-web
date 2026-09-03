// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { PermissionsService, UsuarioBusqueda } from '@core/services/permissions';
import { SedeSimpleDto } from '@features/intranet/pages/admin/users/models';
import { EduAutoComplete, EduButton, EduSelect, EduTemplate } from '@edu-ui';
import type { EduAutoCompleteCompleteEvent } from '@edu-ui';

import { CrosschexTriggerFacade } from '../../services';

// #endregion
// #region Implementation
/**
 * Trigger de simulación CrossChex (P107 F2) — dispara el mismo endpoint de registro
 * manual de asistencia que usa el flujo de "lector caído", sin tocar CrossChex real.
 * El backend decide entrada/salida según la marcación del día ya existente para la persona.
 */
@Component({
	selector: 'app-crosschex-trigger-form',
	standalone: true,
	imports: [FormsModule, EduAutoComplete, EduTemplate, EduSelect, EduButton],
	templateUrl: './crosschex-trigger-form.component.html',
	styleUrl: './crosschex-trigger-form.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrosschexTriggerFormComponent implements OnInit {
	private readonly permissionsApi = inject(PermissionsService);
	private readonly facade = inject(CrosschexTriggerFacade);
	private readonly destroyRef = inject(DestroyRef);

	readonly personaSuggestions = signal<UsuarioBusqueda[]>([]);
	readonly searchingPersona = signal(false);
	readonly selectedPersona = signal<UsuarioBusqueda | null>(null);

	readonly sedes = signal<SedeSimpleDto[]>([]);
	readonly selectedSedeId = signal<number | null>(null);

	readonly triggering = signal(false);

	readonly isFormValid = computed(() => this.selectedPersona() !== null && this.selectedSedeId() !== null);

	ngOnInit(): void {
		this.facade
			.listarSedes()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((sedes) => this.sedes.set(sedes));
	}

	onSearchPersona(event: EduAutoCompleteCompleteEvent): void {
		this.searchingPersona.set(true);
		this.permissionsApi
			.searchUsers(event.query || undefined)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.personaSuggestions.set(result.usuarios);
					this.searchingPersona.set(false);
				},
				error: () => {
					this.personaSuggestions.set([]);
					this.searchingPersona.set(false);
				},
			});
	}

	onSelectPersona(persona: UsuarioBusqueda): void {
		this.selectedPersona.set(persona);
	}

	onTrigger(): void {
		const persona = this.selectedPersona();
		const sedeId = this.selectedSedeId();
		if (!persona?.dni || sedeId === null) return;

		const sede = this.sedes().find((s) => s.id === sedeId);
		if (!sede) return;

		this.triggering.set(true);
		this.facade
			.trigger({ dni: persona.dni, ubicacion: sede.nombre, fecha: new Date().toISOString() })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.triggering.set(false);
					this.selectedPersona.set(null);
				},
				error: () => {
					this.triggering.set(false);
				},
			});
	}
}
// #endregion
