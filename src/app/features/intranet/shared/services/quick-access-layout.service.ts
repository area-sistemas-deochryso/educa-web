import { computed, Injectable, inject, signal } from '@angular/core';

import { StorageService } from '@core/services';
import { MENU_ITEMS, PreviewLayout } from '@intranet-shared/config/intranet-menu.config';
import {
	QuickAccessGroupSlot,
	QuickAccessItemSlot,
	QuickAccessLayout,
	QuickAccessSize,
	QuickAccessSlot,
} from '@data/models';
import { CapabilityCode } from '@shared/types';

export interface ResolvedQuickAccessItem {
	route: string;
	label: string;
	icon: string;
	capability: CapabilityCode;
	description: string;
	preview: PreviewLayout;
	size: QuickAccessSize;
}

export interface ResolvedQuickAccessGroup {
	id: string;
	label: string;
	items: ResolvedQuickAccessItem[];
}

export type ResolvedQuickAccessSlot =
	| ({ kind: 'item' } & ResolvedQuickAccessItem)
	| ({ kind: 'group' } & ResolvedQuickAccessGroup);

export interface ResolvedQuickAccessLayout {
	slots: ResolvedQuickAccessSlot[];
}

const DEFAULT_GROUP_LABEL = 'Nuevo grupo';

@Injectable({ providedIn: 'root' })
export class QuickAccessLayoutService {
	private storage = inject(StorageService);

	// #region Estado privado
	private readonly _layout = signal<QuickAccessLayout>(this.storage.getQuickAccessLayout());
	// #endregion

	// #region Lecturas públicas
	readonly layout = this._layout.asReadonly();
	readonly hasCustomLayout = computed(() => this._layout().slots.length > 0);

	/** Rutas aplanadas (sueltas + las de dentro de grupos), usado por el buscador Ctrl+K para el top row. */
	readonly favoriteRoutes = computed<string[]>(() =>
		this._layout().slots.flatMap((slot) => (slot.kind === 'item' ? [slot.route] : slot.items.map((item) => item.route))),
	);
	// #endregion

	// #region Consultas por ruta (usadas por el buscador Ctrl+K)
	isFavorite(route: string): boolean {
		return this.findSlotIndex(route) !== null;
	}

	/** Agrega/quita `route` como slot suelto tamaño chico. Usado por el buscador Ctrl+K. */
	toggleFavorite(route: string): void {
		if (this.isFavorite(route)) {
			this.removeItem(route);
			return;
		}
		this.addItem(route);
	}
	// #endregion

	/** Materializa el fallback por rol como layout editable, si el usuario nunca personalizó nada. */
	seedFromRoutes(routes: string[]): void {
		if (this.hasCustomLayout()) return;
		const slots: QuickAccessItemSlot[] = routes.map((route) => ({ kind: 'item', route, size: 'sm' }));
		this.commit({ slots });
	}

	// #region Comandos — items sueltos
	addItem(route: string, size: QuickAccessSize = 'sm'): void {
		const current = this._layout();
		const newSlot: QuickAccessItemSlot = { kind: 'item', route, size };
		this.commit({ slots: [...current.slots, newSlot] });
	}

	removeItem(route: string): void {
		const current = this._layout();
		const slots = current.slots
			.map((slot) => (slot.kind === 'group' ? this.withoutGroupItem(slot, route) : slot))
			.filter((slot): slot is QuickAccessSlot => slot !== null)
			.filter((slot) => !(slot.kind === 'item' && slot.route === route));
		this.commit({ slots });
	}

	renameItem(route: string, customLabel: string | null): void {
		const current = this._layout();
		const slots = current.slots.map((slot) => {
			if (slot.kind === 'item' && slot.route === route) {
				return { ...slot, customLabel: customLabel ?? undefined };
			}
			if (slot.kind === 'group') {
				return {
					...slot,
					items: slot.items.map((item) =>
						item.route === route ? { ...item, customLabel: customLabel ?? undefined } : item,
					),
				};
			}
			return slot;
		});
		this.commit({ slots });
	}

	resizeItem(route: string, size: QuickAccessSize): void {
		const current = this._layout();
		const slots = current.slots.map((slot) =>
			slot.kind === 'item' && slot.route === route ? { ...slot, size } : slot,
		);
		this.commit({ slots });
	}

	reorderSlots(fromIndex: number, toIndex: number): void {
		const slots = [...this._layout().slots];
		const [moved] = slots.splice(fromIndex, 1);
		if (!moved) return;
		slots.splice(toIndex, 0, moved);
		this.commit({ slots });
	}
	// #endregion

	// #region Comandos — grupos
	createGroupFromItems(routeA: string, routeB: string): void {
		const current = this._layout();
		const indexA = current.slots.findIndex((slot) => slot.kind === 'item' && slot.route === routeA);
		const slotA = current.slots[indexA];
		const slotB = current.slots.find((slot) => slot.kind === 'item' && slot.route === routeB);
		if (indexA === -1 || slotA?.kind !== 'item' || slotB?.kind !== 'item') return;

		const group: QuickAccessGroupSlot = {
			kind: 'group',
			id: crypto.randomUUID(),
			label: DEFAULT_GROUP_LABEL,
			items: [
				{ route: slotA.route, customLabel: slotA.customLabel },
				{ route: slotB.route, customLabel: slotB.customLabel },
			],
		};

		const slots = current.slots
			.filter((slot) => !(slot.kind === 'item' && (slot.route === routeA || slot.route === routeB)))
			.slice();
		slots.splice(indexA, 0, group);
		this.commit({ slots });
	}

	moveItemIntoGroup(route: string, groupId: string): void {
		const current = this._layout();
		const itemSlot = current.slots.find((slot) => slot.kind === 'item' && slot.route === route);
		if (itemSlot?.kind !== 'item') return;

		const slots = current.slots
			.filter((slot) => !(slot.kind === 'item' && slot.route === route))
			.map((slot) =>
				slot.kind === 'group' && slot.id === groupId
					? { ...slot, items: [...slot.items, { route: itemSlot.route, customLabel: itemSlot.customLabel }] }
					: slot,
			);
		this.commit({ slots });
	}

	moveItemOutOfGroup(route: string, groupId: string): void {
		const current = this._layout();
		const groupIndex = current.slots.findIndex((slot) => slot.kind === 'group' && slot.id === groupId);
		const group = current.slots[groupIndex];
		if (groupIndex === -1 || group?.kind !== 'group') return;

		const movedItem = group.items.find((item) => item.route === route);
		if (!movedItem) return;

		const remainingItems = group.items.filter((item) => item.route !== route);
		const slots = [...current.slots];

		if (remainingItems.length <= 1) {
			slots.splice(groupIndex, 1, ...remainingItems.map((item) => this.toItemSlot(item)));
		} else {
			slots[groupIndex] = { ...group, items: remainingItems };
		}

		slots.push(this.toItemSlot(movedItem));
		this.commit({ slots });
	}

	renameGroup(groupId: string, label: string): void {
		const current = this._layout();
		const slots = current.slots.map((slot) => (slot.kind === 'group' && slot.id === groupId ? { ...slot, label } : slot));
		this.commit({ slots });
	}

	deleteGroup(groupId: string): void {
		const current = this._layout();
		const groupIndex = current.slots.findIndex((slot) => slot.kind === 'group' && slot.id === groupId);
		const group = current.slots[groupIndex];
		if (groupIndex === -1 || group?.kind !== 'group') return;

		const slots = [...current.slots];
		slots.splice(groupIndex, 1, ...group.items.map((item) => this.toItemSlot(item)));
		this.commit({ slots });
	}
	// #endregion

	// #region Resolución contra MENU_ITEMS
	resolveLayout(): ResolvedQuickAccessLayout {
		const slots = this._layout()
			.slots.map((slot): ResolvedQuickAccessSlot | null => {
				if (slot.kind === 'item') {
					const resolved = this.resolveItem(slot.route, slot.customLabel, slot.size);
					return resolved ? { kind: 'item', ...resolved } : null;
				}

				const items = slot.items
					.map((item) => this.resolveItem(item.route, item.customLabel, 'sm'))
					.filter((item): item is ResolvedQuickAccessItem => item !== null);
				if (items.length === 0) return null;

				return { kind: 'group', id: slot.id, label: slot.label, items };
			})
			.filter((slot): slot is ResolvedQuickAccessSlot => slot !== null);

		return { slots };
	}
	// #endregion

	// #region Privados
	private resolveItem(route: string, customLabel: string | undefined, size: QuickAccessSize): ResolvedQuickAccessItem | null {
		const menuItem = MENU_ITEMS.find((m) => m.route === route);
		if (!menuItem) return null;
		return {
			route: menuItem.route,
			label: customLabel ?? menuItem.label,
			icon: menuItem.icon.replace('pi ', ''),
			capability: menuItem.capability,
			description: menuItem.description ?? '',
			preview: menuItem.preview ?? 'admin-table',
			size,
		};
	}

	private findSlotIndex(route: string): number | null {
		const slots = this._layout().slots;
		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i];
			if (slot.kind === 'item' && slot.route === route) return i;
			if (slot.kind === 'group' && slot.items.some((item) => item.route === route)) return i;
		}
		return null;
	}

	private withoutGroupItem(group: QuickAccessGroupSlot, route: string): QuickAccessSlot | null {
		if (!group.items.some((item) => item.route === route)) return group;

		const remaining = group.items.filter((item) => item.route !== route);
		if (remaining.length === 0) return null;
		if (remaining.length === 1) return this.toItemSlot(remaining[0]);
		return { ...group, items: remaining };
	}

	private toItemSlot(item: { route: string; customLabel?: string }): QuickAccessItemSlot {
		return { kind: 'item', route: item.route, size: 'sm', customLabel: item.customLabel };
	}

	private commit(layout: QuickAccessLayout): void {
		this._layout.set(layout);
		this.storage.setQuickAccessLayout(layout);
	}
	// #endregion
}
