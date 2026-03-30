// #region Imports
import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/components';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { periodoActual, esVerano } from '@shared/models';

// #endregion
// #region Implementation

/**
 * Header de usuarios con acciones de página:
 * Refrescar, Importar, Nuevo Usuario y dialog de exportación
 */
@Component({
	selector: 'app-usuarios-header',
	standalone: true,
	imports: [ButtonModule, PageHeaderComponent, DialogModule, SelectModule, FormsModule, TooltipModule],
	templateUrl: './usuarios-header.component.html',
	styleUrl: './usuarios-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosHeaderComponent {
	// #region Outputs
	readonly refresh = output<void>();
	readonly newUsuario = output<void>();
	readonly importUsuarios = output<void>();
	readonly exportCredenciales = output<{ rol: string; esVerano: boolean; anio?: number }>();
	// #endregion

	// #region Estado de exportación
	readonly esVerano = signal(esVerano(periodoActual()));
	readonly exportAnio = signal(new Date().getFullYear());
	readonly exportDialogVisible = signal(false);
	readonly anioOptions = Array.from(
		{ length: new Date().getFullYear() - 2026 + 1 },
		(_, i) => {
			const year = 2026 + i;
			return { label: year.toString(), value: year };
		},
	);
	// #endregion

	// #region Handlers
	onRefresh(): void {
		this.refresh.emit();
	}

	onNewUsuario(): void {
		this.newUsuario.emit();
	}

	onImportUsuarios(): void {
		this.importUsuarios.emit();
	}

	onOpenExportDialog(): void {
		this.exportDialogVisible.set(true);
	}

	onExportDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.exportDialogVisible.set(false);
		}
	}

	setPeriodo(verano: boolean): void {
		this.esVerano.set(verano);
	}

	onExportCredenciales(rol: string): void {
		this.exportCredenciales.emit({
			rol,
			esVerano: this.esVerano(),
			anio: this.exportAnio(),
		});
		this.exportDialogVisible.set(false);
	}
	// #endregion
}
// #endregion
