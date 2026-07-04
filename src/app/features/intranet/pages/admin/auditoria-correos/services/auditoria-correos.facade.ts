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
						'No se pudo cargar la validación de datos',
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
	 * Plan 43 Chat 2.1 (A13) / Brief 387: navega a `/admin/usuarios` con queryParams
	 * para auto-abrir el dialog de edición del usuario afectado. El DNI viene
	 * enmascarado del BE, así que pasamos `entidadId + tipoOrigen + nombreCompleto`
	 * para que el page destino haga el lookup por id+rol y abra el form
	 * (`openUserName` además pre-filtra el listado como ayuda visual).
	 */
	navegarAUsuario(item: AuditoriaCorreoAsistenciaDto): void {
		this.router.navigate(['/intranet/admin/usuarios'], {
			queryParams: {
				autoOpen: 'true',
				openUserId: item.entidadId,
				openUserRol: item.tipoOrigen,
				openUserName: item.nombreCompleto,
			},
		});
	}
	// #endregion
}
