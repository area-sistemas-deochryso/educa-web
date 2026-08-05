// #region Imports
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { CapabilityCatalogItem } from '@core/services/permissions';
import { Rol } from '@data/models';

import {
	ActualizarExplicacionRequest,
	CrearExplicacionRequest,
	ExplicacionAdminDto,
} from '../../models/explicacion-admin.models';
// #endregion

interface SelectOption<T> {
	label: string;
	value: T;
}

/**
 * Dialog crear/editar explicación del modo informativo (brief 525, plan xrepo-96 F3).
 * Texto plano (sin WYSIWYG, mismo criterio que FAQ). Rol `null` = fila default/fallback;
 * un rol específico crea/edita un override para ese rol sobre la misma ancla.
 */
@Component({
	selector: 'app-explicacion-admin-form-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		DialogModule,
		InputTextModule,
		SelectModule,
		TextareaModule,
		TooltipModule,
	],
	templateUrl: './explicacion-admin-form-dialog.component.html',
	styleUrl: './explicacion-admin-form-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplicacionAdminFormDialogComponent {
	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly explicacion = input<ExplicacionAdminDto | null>(null);
	readonly roles = input<Rol[]>([]);
	readonly capabilities = input<CapabilityCatalogItem[]>([]);
	readonly saving = input(false);

	readonly visibleChange = output<boolean>();
	readonly saveExplicacion = output<{ id: number | null; request: CrearExplicacionRequest | ActualizarExplicacionRequest }>();
	readonly cancelForm = output<void>();
	// #endregion

	// #region State
	readonly ancla = signal('');
	readonly rolId = signal<number | null>(null);
	readonly texto = signal('');
	readonly capabilityId = signal<number | null>(null);

	readonly isEditing = computed(() => this.explicacion() !== null);
	readonly headerLabel = computed(() => (this.isEditing() ? 'Editar explicación' : 'Nueva explicación'));

	readonly rolOptions = computed<SelectOption<number | null>[]>(() => [
		{ label: 'Default (todos los roles)', value: null },
		...this.roles().map((r) => ({ label: r.nombre, value: r.id })),
	]);

	readonly capabilityOptions = computed<SelectOption<number | null>[]>(() => [
		{ label: 'Sin gating (todos)', value: null },
		...this.capabilities().map((c) => ({ label: `${c.nombre} (${c.codigo})`, value: c.id })),
	]);

	readonly isValid = computed(() => this.ancla().trim().length > 0 && this.texto().trim().length > 0);
	// #endregion

	constructor() {
		effect(() => {
			const explicacion = this.explicacion();
			if (explicacion) {
				this.ancla.set(explicacion.ancla);
				// BE serializa con NullValueHandling.Ignore — un rolId/capabilityId null
				// llega como `undefined`, no `null`. Normalizar para que matchee la opción
				// "Default"/"Sin gating" del selector (comparada por igualdad estricta).
				this.rolId.set(explicacion.rolId ?? null);
				this.texto.set(explicacion.texto);
				this.capabilityId.set(explicacion.capabilityId ?? null);
			} else {
				this.resetForm();
			}
		});
	}

	// #region Handlers
	onHide(): void {
		this.visibleChange.emit(false);
	}

	onCancel(): void {
		this.cancelForm.emit();
		this.visibleChange.emit(false);
	}

	onSave(): void {
		if (!this.isValid()) return;

		const base = {
			ancla: this.ancla().trim(),
			rolId: this.rolId(),
			texto: this.texto().trim(),
			capabilityId: this.capabilityId(),
		};

		const current = this.explicacion();
		if (current) {
			this.saveExplicacion.emit({
				id: current.id,
				request: { ...base, rowVersion: current.rowVersion } as ActualizarExplicacionRequest,
			});
		} else {
			this.saveExplicacion.emit({ id: null, request: base as CrearExplicacionRequest });
		}
	}
	// #endregion

	// #region Private helpers
	private resetForm(): void {
		this.ancla.set('');
		this.rolId.set(null);
		this.texto.set('');
		this.capabilityId.set(null);
	}
	// #endregion
}
