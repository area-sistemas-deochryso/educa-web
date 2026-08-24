// #region Imports
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';

import { CapabilityCatalogItem } from '@core/services/permissions';

import {
	ActualizarFaqRequest,
	CrearFaqRequest,
	FaqAdminDto,
	WizardPasoInput,
} from '../../models/faq-admin.models';
import { EduDialog, EduInputText, EduSelect, EduTemplate, EduTextarea, EduTooltip } from '@edu-ui';
// #endregion

interface CapabilityOption {
	label: string;
	value: number | null;
}

/**
 * Dialog crear/editar FAQ + wizard asociado (opcional). Texto plano para
 * pregunta/respuesta (sin WYSIWYG — decisión de la brief). El wizard se
 * reemplaza en bloque al guardar: no hay edición incremental de pasos contra
 * el servidor, solo en memoria hasta confirmar "Guardar".
 */
@Component({
	selector: 'app-faq-admin-form-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, EduDialog, EduInputText, EduSelect, EduTextarea, EduTooltip, EduTemplate],
	templateUrl: './faq-admin-form-dialog.component.html',
	styleUrl: './faq-admin-form-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqAdminFormDialogComponent {
	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly faq = input<FaqAdminDto | null>(null);
	readonly capabilities = input<CapabilityCatalogItem[]>([]);
	readonly saving = input(false);

	readonly visibleChange = output<boolean>();
	readonly saveFaq = output<{ id: number | null; request: CrearFaqRequest | ActualizarFaqRequest }>();
	readonly cancelForm = output<void>();
	// #endregion

	// #region State
	readonly pregunta = signal('');
	readonly respuesta = signal('');
	readonly categoria = signal('');
	readonly capabilityId = signal<number | null>(null);
	readonly wizardTitulo = signal('');
	readonly pasos = signal<WizardPasoInput[]>([]);

	readonly isEditing = computed(() => this.faq() !== null);
	readonly headerLabel = computed(() => (this.isEditing() ? 'Editar FAQ' : 'Nueva FAQ'));

	readonly capabilityOptions = computed<CapabilityOption[]>(() => [
		{ label: 'Todos (sin capability)', value: null },
		...this.capabilities().map((c) => ({ label: `${c.nombre} (${c.codigo})`, value: c.id }))]);

	readonly isValid = computed(() => this.pregunta().trim().length > 0 && this.respuesta().trim().length > 0);
	// #endregion

	constructor() {
		effect(() => {
			const faq = this.faq();
			if (faq) {
				this.pregunta.set(faq.pregunta);
				this.respuesta.set(faq.respuesta);
				this.categoria.set(faq.categoria ?? '');
				this.capabilityId.set(faq.capabilityId);
				this.wizardTitulo.set(faq.wizard?.titulo ?? '');
				this.pasos.set(faq.wizard?.pasos.map((p) => ({ ...p })) ?? []);
			} else {
				this.resetForm();
			}
		});
	}

	// #region Wizard steps
	addPaso(): void {
		const nextOrden = this.pasos().length + 1;
		this.pasos.update((list) => [...list, { orden: nextOrden, texto: '', imagenUrl: null }]);
	}

	removePaso(index: number): void {
		this.pasos.update((list) =>
			list.filter((_, i) => i !== index).map((p, i) => ({ ...p, orden: i + 1 })),
		);
	}

	movePaso(index: number, direction: -1 | 1): void {
		const list = [...this.pasos()];
		const target = index + direction;
		if (target < 0 || target >= list.length) return;
		[list[index], list[target]] = [list[target], list[index]];
		this.pasos.set(list.map((p, i) => ({ ...p, orden: i + 1 })));
	}

	updatePasoTexto(index: number, texto: string): void {
		this.pasos.update((list) => list.map((p, i) => (i === index ? { ...p, texto } : p)));
	}

	updatePasoImagen(index: number, imagenUrl: string): void {
		this.pasos.update((list) =>
			list.map((p, i) => (i === index ? { ...p, imagenUrl: imagenUrl || null } : p)),
		);
	}
	// #endregion

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

		const wizard =
			this.pasos().length > 0
				? { titulo: this.wizardTitulo().trim() || null, pasos: this.pasos() }
				: null;

		const base = {
			pregunta: this.pregunta().trim(),
			respuesta: this.respuesta().trim(),
			categoria: this.categoria().trim() || null,
			capabilityId: this.capabilityId(),
			wizard,
		};

		const current = this.faq();
		if (current) {
			this.saveFaq.emit({
				id: current.id,
				request: { ...base, rowVersion: current.rowVersion } as ActualizarFaqRequest,
			});
		} else {
			this.saveFaq.emit({ id: null, request: base as CrearFaqRequest });
		}
	}
	// #endregion

	// #region Private helpers
	private resetForm(): void {
		this.pregunta.set('');
		this.respuesta.set('');
		this.categoria.set('');
		this.capabilityId.set(null);
		this.wizardTitulo.set('');
		this.pasos.set([]);
	}
	// #endregion
}
