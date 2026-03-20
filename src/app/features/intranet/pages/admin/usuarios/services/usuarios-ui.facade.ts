import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ErrorHandlerService } from '@core/services';
import { logger, withRetry } from '@core/helpers';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { UsuarioDetalle, UsuarioLista } from './usuarios.models';
import { UsuariosService } from './usuarios.service';
import { UsuariosStore } from './usuarios.store';

/**
 * Facade for UI state: dialogs, drawers, detail views, and form field updates.
 * Thin orchestration layer between user interactions and store commands.
 */
@Injectable({ providedIn: 'root' })
export class UsuariosUiFacade {
	private usuariosService = inject(UsuariosService);
	private store = inject(UsuariosStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);

	// #region Detail View

	openDetail(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(
				withRetry({ tag: 'UsuariosUiFacade:openDetail' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (detalle) => {
					if (detalle) {
						this.store.openDetailDrawer(detalle);
					}
				},
				error: (err) => {
					logger.error('Error al cargar detalle de usuario:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
				},
			});
	}

	closeDetail(): void {
		this.store.closeDetailDrawer();
	}

	// #endregion
	// #region Dialog Management

	openNew(): void {
		this.store.openNewDialog();
	}

	editUsuario(usuario: UsuarioLista): void {
		this.usuariosService
			.obtenerUsuario(usuario.rol, usuario.id)
			.pipe(
				withRetry({ tag: 'UsuariosUiFacade:editUsuario' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (detalle) => {
					if (detalle) {
						this.store.openEditDialog(detalle);
					}
				},
				error: (err) => {
					logger.error('Error al cargar datos para edicion:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
				},
			});
	}

	editFromDetail(): void {
		const usuario = this.store.selectedUsuario();
		if (usuario) {
			this.store.closeDetailDrawer();
			this.store.openEditDialog(usuario);
		}
	}

	hideDialog(): void {
		this.store.closeDialog();
	}

	// #endregion
	// #region Confirm Dialog

	openConfirmDialog(): void {
		this.store.openConfirmDialogVisible();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialogVisible();
	}

	// #endregion
	// #region Import Dialog

	openImportDialog(): void {
		this.store.openImportDialog();
	}

	closeImportDialog(): void {
		this.store.closeImportDialog();
	}

	// #endregion
	// #region Form Management

	updateFormField(field: string, value: unknown): void {
		this.store.updateFormData({ [field]: value });
	}

	// #endregion
}
