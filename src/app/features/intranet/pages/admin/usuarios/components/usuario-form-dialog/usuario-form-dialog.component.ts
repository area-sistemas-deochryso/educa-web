import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormFieldErrorComponent } from '@shared/components';
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	ROLES_USUARIOS_ADMIN,
	RolUsuarioAdmin,
} from '@core/services';

export type UsuarioFormData = Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>;

export interface FormValidationErrors {
	dniError: string | null;
	correoError: string | null;
	correoApoderadoError: string | null;
}

/**
 * Componente presentacional para el dialog de formulario de usuario
 * Edición y creación de usuarios
 */
@Component({
	selector: 'app-usuario-form-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		InputTextModule,
		SelectModule,
		ToggleSwitch,
		PasswordModule,
		DatePickerModule,
		FormFieldErrorComponent,
	],
	templateUrl: './usuario-form-dialog.component.html',
	styleUrl: './usuario-form-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormDialogComponent {
	readonly visible = input.required<boolean>();
	readonly isEditing = input.required<boolean>();
	readonly formData = input.required<UsuarioFormData>();
	readonly errors = input.required<FormValidationErrors>();
	readonly isFormValid = input.required<boolean>();

	readonly visibleChange = output<boolean>();
	readonly fieldChange = output<{ field: string; value: unknown }>();
	readonly save = output<void>();
	readonly cancelDialog = output<void>();

	readonly rolesSelectOptions = ROLES_USUARIOS_ADMIN.map((r) => ({ label: r, value: r }));

	// Computed - Es estudiante si rol es Estudiante
	get isEstudiante(): boolean {
		return this.formData().rol === 'Estudiante';
	}

	// Helper para tipar correctamente el rol
	get rolValue(): RolUsuarioAdmin | undefined {
		return this.formData().rol as RolUsuarioAdmin | undefined;
	}

	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onFieldChange(field: string, value: unknown): void {
		this.fieldChange.emit({ field, value });
	}

	onSave(): void {
		this.save.emit();
	}

	onCancel(): void {
		this.cancelDialog.emit();
	}
}
