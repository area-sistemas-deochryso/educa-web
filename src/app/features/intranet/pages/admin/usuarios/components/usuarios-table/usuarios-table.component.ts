import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioLista } from '@core/services';
import { AdminUtilsService } from '@shared/services';
import { TableLoadingDirective } from '@app/shared';

/**
 * Componente presentacional para la tabla de usuarios
 * Muestra listado con acciones
 */
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

	readonly usuarios = input.required<UsuarioLista[]>();
	readonly loading = input.required<boolean>();

	readonly viewDetail = output<UsuarioLista>();
	readonly edit = output<UsuarioLista>();
	readonly toggleEstado = output<UsuarioLista>();

	onViewDetail(usuario: UsuarioLista): void {
		this.viewDetail.emit(usuario);
	}

	onEdit(usuario: UsuarioLista): void {
		this.edit.emit(usuario);
	}

	onToggleEstado(usuario: UsuarioLista): void {
		this.toggleEstado.emit(usuario);
	}
}
