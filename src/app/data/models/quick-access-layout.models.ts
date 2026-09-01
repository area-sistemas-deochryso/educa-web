export type QuickAccessSize = 'sm' | 'md' | 'lg';

export interface QuickAccessItemSlot {
	kind: 'item';
	route: string;
	size: QuickAccessSize;
	customLabel?: string;
}

export interface QuickAccessGroupItem {
	route: string;
	customLabel?: string;
}

export interface QuickAccessGroupSlot {
	kind: 'group';
	id: string;
	label: string;
	items: QuickAccessGroupItem[];
}

export type QuickAccessSlot = QuickAccessItemSlot | QuickAccessGroupSlot;

export interface QuickAccessLayout {
	slots: QuickAccessSlot[];
}
