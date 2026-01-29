import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Componente presentacional para el header de usuarios
 * Muestra título y botón de refrescar
 */
@Component({
	selector: 'app-usuarios-header',
	standalone: true,
	imports: [ButtonModule],
	templateUrl: './usuarios-header.component.html',
	styleUrl: './usuarios-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosHeaderComponent {
	readonly refresh = output<void>();

	onRefresh(): void {
		this.refresh.emit();
	}
}
