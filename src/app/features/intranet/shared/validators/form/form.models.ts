// #region Imports
import { FormControl, FormGroup } from '@angular/forms';
import { UserRole } from '@core/services/auth';

/**
 * Interfaces tipadas para formularios reactivos
 */

// Login Form
// #endregion
// #region Implementation
export interface LoginFormValue {
	dni: string;
	password: string;
	rol: UserRole;
	rememberMe: boolean;
}

export type LoginFormGroup = FormGroup<{
	dni: FormControl<string>;
	password: FormControl<string>;
	rol: FormControl<UserRole>;
	rememberMe: FormControl<boolean>;
}>;

// Registro Form (ejemplo para futura implementacion)
export interface RegisterFormValue {
	dni: string;
	email: string;
	password: string;
	confirmPassword: string;
	nombres: string;
	apellidos: string;
	telefono: string;
	rol: UserRole;
}

export type RegisterFormGroup = FormGroup<{
	dni: FormControl<string>;
	email: FormControl<string>;
	password: FormControl<string>;
	confirmPassword: FormControl<string>;
	nombres: FormControl<string>;
	apellidos: FormControl<string>;
	telefono: FormControl<string>;
	rol: FormControl<UserRole>;
}>;

// Contact Form
export interface ContactFormValue {
	nombre: string;
	email: string;
	telefono: string;
	asunto: string;
	mensaje: string;
}

export type ContactFormGroup = FormGroup<{
	nombre: FormControl<string>;
	email: FormControl<string>;
	telefono: FormControl<string>;
	asunto: FormControl<string>;
	mensaje: FormControl<string>;
}>;

// Password Recovery Form
export interface PasswordRecoveryFormValue {
	email: string;
}

export type PasswordRecoveryFormGroup = FormGroup<{
	email: FormControl<string>;
}>;

// Password Reset Form
export interface PasswordResetFormValue {
	newPassword: string;
	confirmPassword: string;
}

export type PasswordResetFormGroup = FormGroup<{
	newPassword: FormControl<string>;
	confirmPassword: FormControl<string>;
}>;
// #endregion
