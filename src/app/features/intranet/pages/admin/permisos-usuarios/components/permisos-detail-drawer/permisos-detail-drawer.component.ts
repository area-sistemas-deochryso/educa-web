import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TagModule } from 'primeng/tag';

import { PermisoUsuario } from '@core/services';
import { UiMappingService } from '@shared/services';
import { ModuloVistas } from '../../services/permisos-usuarios.store';

@Component({
	selector: 'app-permisos-detail-drawer',
	standalone: true,
	imports: [ButtonModule, DrawerModule, TagModule],
	templateUrl: './permisos-detail-drawer.component.html',
	styleUrl: './permisos-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermisosDetailDrawerComponent {
	readonly uiMapping = inject(UiMappingService);

	// #region Inputs / Outputs
	readonly visible = input.required<boolean>();
	readonly permiso = input.required<PermisoUsuario | null>();
	readonly moduloVistas = input.required<ModuloVistas[]>();

	readonly visibleChange = output<boolean>();
	readonly edit = output<void>();
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onEdit(): void {
		this.edit.emit();
	}

	onClose(): void {
		this.visibleChange.emit(false);
	}
	// #endregion
}
