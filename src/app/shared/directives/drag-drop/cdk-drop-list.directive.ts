import { Directive, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import type { CdkDragDrop } from './drag-drop.models';
import { dragState } from './drag-drop.models';

@Directive({
	// eslint-disable-next-line @angular-eslint/directive-selector
	selector: '[cdkDropList]',
	standalone: true,
	host: {
		'[attr.id]': 'id',
		'(dragover)': 'onDragOver($event)',
		'(drop)': 'onDrop($event)',
		'(dragleave)': 'onDragLeave($event)',
	},
})
export class CdkDropList<T = unknown> implements OnInit, OnDestroy {
	private el = inject(ElementRef<HTMLElement>);

	@Input() id = '';
	@Input('cdkDropListData') data!: T;
	@Input('cdkDropListConnectedTo') connectedTo: string[] = [];
	@Output('cdkDropListDropped') readonly dropped = new EventEmitter<CdkDragDrop<T>>();

	ngOnInit(): void {
		this.el.nativeElement.dataset['dropListId'] = this.id;
	}

	ngOnDestroy(): void {
		delete this.el.nativeElement.dataset['dropListId'];
	}

	onDragOver(event: DragEvent): void {
		if (!this.canReceive()) return;
		event.preventDefault();
		this.el.nativeElement.classList.add('cdk-drop-list-dragging');
	}

	onDragLeave(_event: DragEvent): void {
		this.el.nativeElement.classList.remove('cdk-drop-list-dragging');
	}

	onDrop(event: DragEvent): void {
		event.preventDefault();
		this.el.nativeElement.classList.remove('cdk-drop-list-dragging');

		const active = dragState.activeItem;
		if (!active) return;

		// Calcular índice destino basado en posición del mouse
		const dropIndex = this.getDropIndex(event);

		const dropEvent: CdkDragDrop<T> = {
			previousContainer: { id: active.sourceListId, data: this.getListDataById(active.sourceListId) },
			container: { id: this.id, data: this.data },
			previousIndex: active.sourceIndex,
			currentIndex: dropIndex,
			item: { data: active.data as T },
		};

		this.dropped.emit(dropEvent);
		dragState.activeItem = null;
	}

	private canReceive(): boolean {
		if (!dragState.activeItem) return false;
		const sourceId = dragState.activeItem.sourceListId;
		// Puede recibir si es la misma lista o está en connectedTo
		return sourceId === this.id || this.connectedTo.length === 0 || this.connectedTo.includes(sourceId);
	}

	private getDropIndex(event: DragEvent): number {
		const children = Array.from(this.el.nativeElement.children)
			.filter((el): el is HTMLElement => el instanceof HTMLElement)
			.filter((el) => el.hasAttribute('cdkdrag') || el.dataset['cdkDrag'] !== undefined);
		const y = event.clientY;

		for (let i = 0; i < children.length; i++) {
			const rect = children[i].getBoundingClientRect();
			if (y < rect.top + rect.height / 2) return i;
		}
		return children.length;
	}

	private getListDataById(listId: string): T {
		if (listId === this.id) return this.data;
		// Intentar encontrar la lista por ID en el DOM
		const el = document.getElementById(listId);
		// Retornamos data genérico — el consumidor usa su propio tipado
		return (el?.dataset?.['dropListData'] ?? this.data) as T;
	}
}
