export interface CdkDragDrop<TContainer, TItem = TContainer, TData = unknown> {
	previousContainer: { id: string; data: TContainer };
	container: { id: string; data: TContainer };
	previousIndex: number;
	currentIndex: number;
	item: { data: TData };
}

// Estado global compartido entre directivas durante un drag
export const dragState = {
	activeItem: null as { data: unknown; sourceListId: string; sourceIndex: number } | null,
};
