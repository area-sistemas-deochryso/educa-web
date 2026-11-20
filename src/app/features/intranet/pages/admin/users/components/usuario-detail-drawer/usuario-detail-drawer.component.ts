// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { getInitialsFromParts } from '@core/helpers';
import { UsuarioDetalle } from '../../services';
import { UiMappingService } from '@intranet-shared/services';
import { EstadoLabelPipe, EstadoSeverityPipe } from '@intranet-shared/pipes';
import { FullNamePipe } from '@shared/pipes';
import { EduAvatar, EduButton, EduDrawer, EduTag } from '@edu-ui';

/**
 * Componente presentacional para el drawer de detalles de usuario
 * Muestra información de solo lectura con opción de editar
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-user-detail-drawer',
	standalone: true,
	imports: [DatePipe, EduAvatar, EduDrawer, EduButton, EduTag, EstadoLabelPipe, EstadoSeverityPipe, FullNamePipe],
	templateUrl: './usuario-detail-drawer.component.html',
	styleUrl: './usuario-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailDrawerComponent {
	readonly uiMapping = inject(UiMappingService);

	// * Inputs for visibility and selected user.
	readonly visible = input.required<boolean>();
	readonly usuario = input.required<UsuarioDetalle | null>();

	protected readonly initials = computed(() => {
		const u = this.usuario();
		return u ? getInitialsFromParts(u.apellidos, u.nombres) : '';
	});

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
