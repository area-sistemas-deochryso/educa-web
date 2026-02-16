// #region Imports
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TagModule } from 'primeng/tag';
import { UsuarioDetalle } from '@core/services';
import { AdminUtilsService } from '@shared/services';

/**
 * Componente presentacional para el drawer de detalles de usuario
 * Muestra información de solo lectura con opción de editar
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-usuario-detail-drawer',
	standalone: true,
	imports: [CommonModule, DrawerModule, ButtonModule, TagModule],
	templateUrl: './usuario-detail-drawer.component.html',
	styleUrl: './usuario-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioDetailDrawerComponent {
	readonly adminUtils = inject(AdminUtilsService);

	// * Inputs for visibility and selected user.
	readonly visible = input.required<boolean>();
	readonly usuario = input.required<UsuarioDetalle | null>();

	// * Outputs for dialog actions.
	readonly visibleChange = output<boolean>();
	readonly closeDrawer = output<void>();
	readonly edit = output<void>();

	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onClose(): void {
		this.closeDrawer.emit();
	}

	onEdit(): void {
		this.edit.emit();
	}
}
// #endregion
