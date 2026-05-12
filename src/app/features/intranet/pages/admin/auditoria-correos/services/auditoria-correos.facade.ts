import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';

import { AuditoriaCorreoAsistenciaDto, TipoOrigenAuditoria } from '../models';
import { AuditoriaCorreosService } from './auditoria-correos.service';
import { AuditoriaCorreosStore } from './auditoria-correos.store';

@Injectable({ providedIn: 'root' })
export class AuditoriaCorreosFacade {
	// #region Dependencias
	private readonly api = inject(AuditoriaCorreosService);
	private readonly store = inject(AuditoriaCorreosStore);
	private readonly destroyRef = inject(DestroyRef);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly router = inject(Router);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Carga de datos
	loadAuditoria(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);

		this.api
			.listar()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[AuditoriaCorreosFacade] Error al cargar auditoría:', err);
					this.store.setLoading(false);
					this.store.setTableReady(true);
					this.errorHandler.showError(
						'No se pudo cargar la auditoría',
						'Intenta refrescar. Si el problema persiste, revisa la consola.',
					);
				},
			});
	}

	refresh(): void {
		this.loadAuditoria();
	}
	// #endregion

	// #region Filtros
	setFilterTipo(tipo: TipoOrigenAuditoria | null): void {
		this.store.setFilterTipo(tipo);
	}

	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
	}

	clearFilters(): void {
		this.store.clearFilters();
	}
	// #endregion

	// #region Navegación
	/**
	 * Plan 43 Chat 2.1 (A13): navega a `/admin/usuarios` con queryParams para
	 * auto-abrir el dialog de edición del usuario afectado. El DNI viene
	 * enmascarado del BE, así que pasamos `entidadId + tipoOrigen + nombreCompleto`
	 * para que el page destino haga el lookup y abra el form.
	 * Mantenemos el copy-to-clipboard como fallback si el lookup no encuentra
	 * el usuario (paginación, filtros, etc.).
	 */
	async navegarAUsuario(item: AuditoriaCorreoAsistenciaDto): Promise<void> {
		const ok = await this.copyToClipboard(item.nombreCompleto);
		if (ok) {
			this.errorHandler.showInfo(
				'Nombre copiado',
				`Abriendo "${item.nombreCompleto}". Si no se abre el formulario, pega el nombre en el buscador.`,
			);
		}
		this.router.navigate(['/intranet/admin/usuarios'], {
			queryParams: {
				autoOpen: 'true',
				openUserId: item.entidadId,
				openUserRol: item.tipoOrigen,
				openUserName: item.nombreCompleto,
			},
		});
	}

	private async copyToClipboard(text: string): Promise<boolean> {
		// Guard SSR/pre-render: `navigator` no existe en Node durante el build.
		if (typeof navigator === 'undefined') return false;
		try {
			if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
				await navigator.clipboard.writeText(text);
				return true;
			}
		} catch (err) {
			logger.warn('[AuditoriaCorreosFacade] Clipboard API falló:', err);
		}
		return false;
	}
	// #endregion
}
