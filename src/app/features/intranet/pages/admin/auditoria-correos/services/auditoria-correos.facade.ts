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
	 * El DNI del DTO ya viene enmascarado ("***1234") — no sirve para prefiltrar
	 * `/admin/usuarios` por búsqueda. Como ese page tampoco acepta query params
	 * hoy, copiamos el nombre al clipboard y mostramos toast guiando al admin.
	 * Es la opción B del brief (trade-off: no extender scope de usuarios).
	 */
	async navegarAUsuario(item: AuditoriaCorreoAsistenciaDto): Promise<void> {
		const ok = await this.copyToClipboard(item.nombreCompleto);
		if (ok) {
			this.errorHandler.showInfo(
				'Nombre copiado',
				`Pégalo en el buscador de Usuarios para ubicar "${item.nombreCompleto}".`,
			);
		}
		this.router.navigate(['/intranet/admin/usuarios']);
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
