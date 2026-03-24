// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	effect,
	inject,
	input,
	output,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { AuthService } from '@core/services';
import { UserProfileService } from '@core/services';
import { extractErrorMessage } from '@core/helpers';

// #endregion
// #region Implementation
@Component({
	selector: 'app-user-info-dialog',
	standalone: true,
	imports: [
		DialogModule,
		ButtonModule,
		AvatarModule,
		TabsModule,
		TagModule,
		InputTextModule,
		FormsModule,
	],
	templateUrl: './user-info-dialog.component.html',
	styleUrl: './user-info-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MessageService],
})
export class UserInfoDialogComponent {
	// #region Dependencias
	private authService = inject(AuthService);
	private userProfile = inject(UserProfileService);
	private messageService = inject(MessageService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region I/O
	visible = input<boolean>(false);
	visibleChange = output<boolean>();
	// #endregion

	// #region Datos del perfil (solo lectura)
	readonly displayName = this.userProfile.displayName;
	readonly userRole = this.userProfile.userRole;
	readonly initials = this.userProfile.initials;
	readonly dni = this.userProfile.dni;
	readonly userName = this.userProfile.userName;
	// #endregion

	constructor() {
		// Refresca el perfil (incluye DNI) cada vez que el diálogo se abre.
		effect(() => {
			if (this.visible()) {
				this.authService
					.getProfile()
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe();
			}
		});
	}

	// #region Estado del formulario de contraseña
	readonly contrasenaActual = signal('');
	readonly nuevaContrasena = signal('');
	readonly confirmarContrasena = signal('');
	readonly saving = signal(false);
	readonly showContrasenaActual = signal(false);
	readonly showNuevaContrasena = signal(false);
	readonly showConfirmarContrasena = signal(false);
	readonly submitted = signal(false);
	// #endregion

	// #region Validaciones computadas
	readonly contrasenaActualError = computed(() => {
		if (!this.submitted()) return null;
		return !this.contrasenaActual().trim() ? 'La contraseña actual es requerida' : null;
	});

	readonly nuevaContrasenaError = computed(() => {
		if (!this.submitted()) return null;
		const pass = this.nuevaContrasena();
		if (!pass.trim()) return 'La nueva contraseña es requerida';
		if (pass.length < 4) return 'Mínimo 4 caracteres';
		return null;
	});

	readonly confirmarContrasenaError = computed(() => {
		if (!this.submitted()) return null;
		const confirm = this.confirmarContrasena();
		if (!confirm.trim()) return 'Confirma la nueva contraseña';
		if (confirm !== this.nuevaContrasena()) return 'Las contraseñas no coinciden';
		return null;
	});

	readonly isFormValid = computed(
		() =>
			!!this.contrasenaActual().trim() &&
			this.nuevaContrasena().length >= 4 &&
			this.confirmarContrasena() === this.nuevaContrasena(),
	);
	// #endregion

	// #region Dialog handlers
	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
			this.resetForm();
		}
	}
	// #endregion

	// #region Comandos
	cambiarContrasena(): void {
		this.submitted.set(true);

		if (!this.isFormValid()) return;

		this.saving.set(true);
		this.authService
			.cambiarContrasena({
				contrasenaActual: this.contrasenaActual(),
				nuevaContrasena: this.nuevaContrasena(),
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.messageService.add({
						severity: 'success',
						summary: 'Contraseña actualizada',
						detail: 'Tu contraseña fue actualizada correctamente',
						life: 4000,
					});
					this.saving.set(false);
					this.resetForm();
					this.visibleChange.emit(false);
				},
				error: (err: unknown) => {
					const mensaje = extractErrorMessage(err, 'No se pudo actualizar la contraseña');
					this.messageService.add({
						severity: 'error',
						summary: 'Error',
						detail: mensaje,
						life: 5000,
					});
					this.saving.set(false);
				},
			});
	}
	// #endregion

	// #region Helpers privados
	private resetForm(): void {
		this.contrasenaActual.set('');
		this.nuevaContrasena.set('');
		this.confirmarContrasena.set('');
		this.submitted.set(false);
		this.showContrasenaActual.set(false);
		this.showNuevaContrasena.set(false);
		this.showConfirmarContrasena.set(false);
	}
	// #endregion
}
// #endregion
