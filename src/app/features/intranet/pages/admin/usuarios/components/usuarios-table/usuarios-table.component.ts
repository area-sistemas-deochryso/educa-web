// #region Imports
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioLista } from '@core/services';
import { AdminUtilsService } from '@shared/services';
import { TableLoadingDirective } from '@app/shared';

/**
 * Componente presentacional para la tabla de usuarios
 * Muestra listado con acciones y paginación server-side
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-usuarios-table',
	standalone: true,
	imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule, TableLoadingDirective],
	templateUrl: './usuarios-table.component.html',
	styleUrl: './usuarios-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosTableComponent {
	readonly adminUtils = inject(AdminUtilsService);

	// * Inputs for table rows + loading overlay + pagination.
	readonly usuarios = input.required<UsuarioLista[]>();
	readonly loading = input.required<boolean>();
	readonly totalRecords = input.required<number>();
	readonly rows = input(10);

	// * Outputs for row actions + pagination.
	readonly viewDetail = output<UsuarioLista>();
	readonly edit = output<UsuarioLista>();
	readonly toggleEstado = output<UsuarioLista>();
	readonly lazyLoad = output<{ page: number; pageSize: number }>();

	// * Track first load to avoid duplicate initial fetch
	private initialLoadDone = false;

	onViewDetail(usuario: UsuarioLista): void {
		this.viewDetail.emit(usuario);
	}

	onEdit(usuario: UsuarioLista): void {
		this.edit.emit(usuario);
	}

	onToggleEstado(usuario: UsuarioLista): void {
		this.toggleEstado.emit(usuario);
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		// Skip the initial lazy load event since facade.loadData() already fetches page 1
		if (!this.initialLoadDone) {
			this.initialLoadDone = true;
			return;
		}

		const first = event.first ?? 0;
		const rows = event.rows ?? this.rows();
		const page = Math.floor(first / rows) + 1;
		this.lazyLoad.emit({ page, pageSize: rows });
	}
}
// #endregion
