// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
	computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { WalStatusStore } from '@core/services';
import { WalEntry } from '@core/services/wal/models';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

// #endregion
// #region Constants

const OPERATION_LABELS: Record<string, string> = {
	CREATE: 'Crear',
	UPDATE: 'Actualizar',
	DELETE: 'Eliminar',
	TOGGLE: 'Cambiar estado',
	CUSTOM: 'Operación',
};

const RESOURCE_LABELS: Record<string, string> = {
	usuarios: 'Usuario',
	horarios: 'Horario',
	'permisos-roles': 'Permiso',
};

// #endregion
// #region Component

@Component({
	selector: 'app-sync-status',
	standalone: true,
	imports: [DatePipe, DrawerModule, ButtonModule, TooltipModule, BadgeModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './sync-status.component.html',
	styleUrl: './sync-status.component.scss',
})
export class SyncStatusComponent {
	// #region Dependencies

	private walStatus = inject(WalStatusStore);

	// #endregion

	// #region State

	private readonly _drawerVisible = signal(false);
	readonly drawerVisible = this._drawerVisible.asReadonly();

	// #endregion

	// #region Computed

	readonly vm = this.walStatus.vm;

	readonly isVisible = computed(
		() => this.vm().hasPending || this.vm().hasFailures || this.vm().hasActivity,
	);

	readonly indicatorClass = computed(() => {
		if (this.vm().hasFailures) return 'indicator--failed';
		if (this.vm().hasActivity || this.vm().hasPending) return 'indicator--syncing';
		return '';
	});

	readonly indicatorIcon = computed(() => {
		if (this.vm().hasFailures) return 'pi pi-exclamation-triangle';
		return 'pi pi-sync';
	});

	readonly badgeCount = computed(() => {
		const { failedCount, pendingCount, inFlightCount } = this.vm();
		if (failedCount > 0) return failedCount;
		return pendingCount + inFlightCount;
	});

	readonly tooltipText = computed(() => {
		const { failedCount, pendingCount, inFlightCount } = this.vm();
		if (failedCount > 0) return `${failedCount} operacion(es) fallida(s)`;
		if (inFlightCount > 0) return 'Sincronizando...';
		if (pendingCount > 0) return `${pendingCount} pendiente(s)`;
		return 'Sincronizado';
	});

	// #endregion

	// #region Event Handlers

	openDrawer(): void {
		this._drawerVisible.set(true);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this._drawerVisible.set(false);
		}
	}

	async retryEntry(id: string): Promise<void> {
		await this.walStatus.retryEntry(id);
	}

	async discardEntry(id: string): Promise<void> {
		await this.walStatus.discardEntry(id);
	}

	async retryAll(): Promise<void> {
		const entries = this.vm().failedEntries;
		for (const entry of entries) {
			await this.walStatus.retryEntry(entry.id);
		}
	}

	async discardAll(): Promise<void> {
		const entries = this.vm().failedEntries;
		for (const entry of entries) {
			await this.walStatus.discardEntry(entry.id);
		}
	}

	// #endregion

	// #region Helpers

	getOperationLabel(entry: WalEntry): string {
		return OPERATION_LABELS[entry.operation] ?? entry.operation;
	}

	getResourceLabel(entry: WalEntry): string {
		return RESOURCE_LABELS[entry.resourceType] ?? entry.resourceType;
	}

	getEntryDescription(entry: WalEntry): string {
		const op = this.getOperationLabel(entry);
		const resource = this.getResourceLabel(entry);
		const idSuffix = entry.resourceId ? ` #${entry.resourceId}` : '';
		return `${op} ${resource}${idSuffix}`;
	}

	// #endregion
}

// #endregion
