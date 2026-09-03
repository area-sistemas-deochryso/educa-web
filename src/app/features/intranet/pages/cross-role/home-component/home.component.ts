// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragMove, CdkDropList } from '@intranet-shared/directives/drag-drop';
import { QuickAccessCardComponent } from '@features/intranet/components/quick-access-card/quick-access-card';
import { QuickAccessGroupCardComponent } from '@features/intranet/components/quick-access-group-card/quick-access-group-card';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { StorageService } from '@core/services';
import { UserPermissionsService } from '@core/services/permissions';
import { UserProfileService } from '@core/services/user';
import { QuickAccessLayoutService, ResolvedQuickAccessSlot } from '@intranet-shared/services';
import { QuickAccessSize } from '@data/models';
import { WelcomeSectionComponent } from '@features/intranet/components/welcome-section/welcome-section';
import { AttendanceSummaryWidgetComponent } from './components/attendance-summary-widget/attendance-summary-widget.component';
import { ProfesorAttendanceWidgetComponent } from './components/profesor-attendance-widget/profesor-attendance-widget.component';

// #endregion
// #region Implementation
@Component({
	selector: 'app-home.component',
	standalone: true,
	imports: [
		QuickAccessCardComponent,
		QuickAccessGroupCardComponent,
		WelcomeSectionComponent,
		AttendanceSummaryWidgetComponent,
		ProfesorAttendanceWidgetComponent,
		CdkDropList,
		CdkDrag,
		CdkDragHandle,
	],
	templateUrl: './home.component.html',
	styleUrl: './home.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
	// #region Dependencias
	private storage = inject(StorageService);
	private flags = inject(FeatureFlagsFacade);
	private userPermisos = inject(UserPermissionsService);
	private userProfile = inject(UserProfileService);
	private layoutService = inject(QuickAccessLayoutService);
	// #endregion

	// #region Estado
	// Los 4 roles administrativos comparten el mismo summary agregado del colegio.
	readonly showAttendanceWidget = computed(() => this.userProfile.isAdministrativo());
	readonly showProfesorWidget = computed(() => this.userProfile.isProfesor());
	readonly showQuickAccess = computed(() => this.flags.isEnabled('quickAccess'));

	readonly editMode = signal(false);

	/** Slot bajo el puntero durante un drag, si está en zona central (candidato a agrupar). */
	private readonly groupTargetKey = signal<string | null>(null);
	readonly currentGroupTargetKey = this.groupTargetKey.asReadonly();
	private draggedKey: string | null = null;

	readonly welcomeTitle = computed(() => {
		const user = this.storage.getUser();
		if (user?.nombreCompleto) {
			return `Bienvenido, ${user.nombreCompleto}`;
		}
		return 'Bienvenido a tu Intranet';
	});

	/** Layout personalizado del usuario. Vacío hasta que marque accesos con el buscador Ctrl+K. */
	readonly resolvedSlots = computed<ResolvedQuickAccessSlot[]>(() =>
		this.layoutService
			.resolveLayout()
			.slots.filter((slot) => (slot.kind === 'item' ? this.userPermisos.hasCapability(slot.capability) : true)),
	);

	// #endregion

	// #region Comandos de edición
	toggleEditMode(): void {
		this.editMode.update((v) => !v);
	}

	slotKey(slot: ResolvedQuickAccessSlot): string {
		return slot.kind === 'item' ? slot.route : `group:${slot.id}`;
	}

	onRemoveItem(route: string): void {
		this.layoutService.removeItem(route);
	}

	onRenameItem(route: string, label: string): void {
		this.layoutService.renameItem(route, label);
	}

	onResizeItem(route: string, size: QuickAccessSize): void {
		this.layoutService.resizeItem(route, size);
	}

	onRenameGroup(groupId: string, label: string): void {
		this.layoutService.renameGroup(groupId, label);
	}

	onDeleteGroup(groupId: string): void {
		this.layoutService.deleteGroup(groupId);
	}

	onRemoveFromGroup(route: string, groupId: string): void {
		this.layoutService.moveItemOutOfGroup(route, groupId);
	}
	// #endregion

	// #region Drag & drop
	onDragStarted(slot: ResolvedQuickAccessSlot): void {
		this.draggedKey = this.slotKey(slot);
		this.groupTargetKey.set(null);
	}

	onDragMoved(event: CdkDragMove<ResolvedQuickAccessSlot>): void {
		const point = event.pointerPosition;
		// Excluye el propio elemento arrastrado (su preview/placeholder también carga data-slot-key)
		// en vez de abortar en el primer match, para no descartar el target real que está debajo.
		const target = document
			.elementsFromPoint(point.x, point.y)
			.filter((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-slot-key'))
			.find((el) => el.getAttribute('data-slot-key') !== this.draggedKey);

		if (!target) {
			this.groupTargetKey.set(null);
			return;
		}

		const key = target.getAttribute('data-slot-key');
		if (!key) {
			this.groupTargetKey.set(null);
			return;
		}

		// Zona generosa (80% del área): un drag real de mouse rara vez suelta en el centro exacto.
		const rect = target.getBoundingClientRect();
		const inCentralZone =
			point.x > rect.left + rect.width * 0.1 &&
			point.x < rect.right - rect.width * 0.1 &&
			point.y > rect.top + rect.height * 0.1 &&
			point.y < rect.bottom - rect.height * 0.1;

		this.groupTargetKey.set(inCentralZone ? key : null);
	}

	onDragEnded(): void {
		// No tocar groupTargetKey acá: el orden real de eventos CDK dispara `ended`
		// antes que `dropped` en algunos casos, y onDrop necesita leerlo intacto.
		this.draggedKey = null;
	}

	onDrop(event: CdkDragDrop<ResolvedQuickAccessSlot[]>): void {
		const draggedSlot = event.item.data as ResolvedQuickAccessSlot;
		const targetKey = this.groupTargetKey();
		this.groupTargetKey.set(null);

		if (targetKey && draggedSlot.kind === 'item') {
			if (targetKey.startsWith('group:')) {
				this.layoutService.moveItemIntoGroup(draggedSlot.route, targetKey.slice('group:'.length));
				return;
			}
			this.layoutService.createGroupFromItems(draggedSlot.route, targetKey);
			return;
		}

		this.layoutService.reorderSlots(event.previousIndex, event.currentIndex);
	}
	// #endregion
}
// #endregion
