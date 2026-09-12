import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@intranet-shared/components';
import { periodoActual, esVerano } from '@shared/models';
import { UserPermissionsService } from '@core/services';

import { RoleTab } from '../../models';
import { EduButton, EduDialog, EduMenu, EduSelect, EduTooltip, type EduMenuItem } from '@edu-ui';

const NEW_BUTTON_LABELS: Record<string, string> = {
	estudiantes: 'Nuevo Estudiante',
	profesores: 'Nuevo Profesor',
	admin: 'Nuevo Usuario',
};

const USUARIOS_EXPORT_CREDENCIALES_MANAGE = 'USUARIOS_EXPORT_CREDENCIALES_MANAGE';

@Component({
	selector: 'app-users-header',
	standalone: true,
	imports: [EduButton, PageHeaderComponent, EduDialog, EduSelect, FormsModule, EduTooltip, EduMenu],
	templateUrl: './usuarios-header.component.html',
	styleUrl: './usuarios-header.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'[class.migration-spotlight-active]': 'migrationSpotlight()',
	},
})
export class UsersHeaderComponent {
	private userPermisos = inject(UserPermissionsService);

	readonly canExportCredenciales = computed(() =>
		this.userPermisos.hasCapability(USUARIOS_EXPORT_CREDENCIALES_MANAGE),
	);

	readonly refresh = output<void>();
	readonly newUsuario = output<void>();
	readonly importUsuarios = output<void>();
	readonly exportCredenciales = output<{ rol: string; esVerano: boolean; anio?: number }>();
	readonly validarDatos = output<void>();
	readonly migratePasswords = output<void>();
	readonly activeTab = input<RoleTab>(null);
	readonly showMigration = input(false);
	readonly migrationLoading = input(false);
	readonly migrationSpotlight = input(false);

	readonly newButtonLabel = computed(() =>
		NEW_BUTTON_LABELS[this.activeTab() ?? ''] ?? 'Nuevo Usuario',
	);

	readonly overflowMenuItems = computed<EduMenuItem[]>(() => {
		const items: EduMenuItem[] = [
			{ label: 'Refrescar', icon: 'pi pi-refresh', command: () => this.refresh.emit() },
			{ label: 'Validar Datos', icon: 'pi pi-check-circle', command: () => this.validarDatos.emit() }];
		if (this.canExportCredenciales()) {
			items.splice(1, 0, { label: 'Exportar', icon: 'pi pi-download', command: () => this.onOpenExportDialog() });
		}
		if (this.activeTab() === 'estudiantes' || this.activeTab() === null) {
			items.splice(this.canExportCredenciales() ? 2 : 1, 0, {
				label: 'Importar',
				icon: 'pi pi-upload',
				command: () => this.importUsuarios.emit(),
			});
		}
		return items;
	});

	// #region Export dialog state
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

	onNewUsuario(): void {
		this.newUsuario.emit();
	}

	onOpenExportDialog(): void {
		this.exportDialogVisible.set(true);
	}

	onExportDialogVisibleChange(visible: boolean): void {
		if (!visible) this.exportDialogVisible.set(false);
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
}
