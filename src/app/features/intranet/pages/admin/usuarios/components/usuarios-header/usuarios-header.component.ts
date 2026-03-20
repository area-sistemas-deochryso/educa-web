// #region Imports
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { PageHeaderComponent } from '@shared/components';
import { ButtonModule } from 'primeng/button';

/**
 * Componente presentacional para el header de usuarios
 * Muestra título y botón de refrescar
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-usuarios-header',
	standalone: true,
	imports: [ButtonModule, PageHeaderComponent],
	templateUrl: './usuarios-header.component.html',
	styleUrl: './usuarios-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosHeaderComponent {
	// * Emits when user requests a refresh.
	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}
}
// #endregion
