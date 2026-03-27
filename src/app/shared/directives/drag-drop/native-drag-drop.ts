/**
 * Fallback drag-drop con HTML5 Drag and Drop API nativa.
 *
 * Implementa los mismos selectores e inputs/outputs que @angular/cdk/drag-drop.
 * Para activar: en index.ts, cambiar los exports de CDK por estos.
 *
 * Limitaciones vs CDK:
 * - Sin animación de placeholder (el browser muestra ghost image nativa)
 * - Sin scroll automático al arrastrar al borde del contenedor
 * - Funcionalidad core (reordenar, mover entre listas, handle, disabled) sí soportada
 */
import { Directive, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';

// #region CdkDragDrop type (compatible con CDK)
export interface CdkDragDrop<TContainer, TItem = TContainer, TData = unknown> {
	previousContainer: { id: string; data: TContainer };
	container: { id: string; data: TContainer };
	previousIndex: number;
	currentIndex: number;
	item: { data: TData };
}
// #endregion

// Estado global compartido entre directivas durante un drag
const dragState = {
	activeItem: null as { data: unknown; sourceListId: string; sourceIndex: number } | null,
};

// #region CdkDropList
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
// #endregion

// #region CdkDrag
@Directive({
	// eslint-disable-next-line @angular-eslint/directive-selector
	selector: '[cdkDrag]',
	standalone: true,
	host: {
		'[attr.draggable]': '!cdkDragDisabled',
		'[class.cdk-drag-disabled]': 'cdkDragDisabled',
		'(dragstart)': 'onDragStart($event)',
		'(dragend)': 'onDragEnd($event)',
	},
})
export class CdkDrag<T = unknown> implements OnInit {
	private el = inject(ElementRef<HTMLElement>);

	@Input('cdkDragData') data!: T;
	@Input() cdkDragDisabled = false;

	ngOnInit(): void {
		this.el.nativeElement.dataset['cdkDrag'] = '';
	}

	onDragStart(event: DragEvent): void {
		if (this.cdkDragDisabled) {
			event.preventDefault();
			return;
		}

		// Verificar que el drag inició desde un handle (si hay handle)
		const handle = this.el.nativeElement.querySelector('[cdkdraghandle]');
		if (handle && event.target instanceof Node && !handle.contains(event.target)) {
			event.preventDefault();
			return;
		}

		const parent = this.el.nativeElement.closest('[cdkdroplist], [cdkDropList]') as HTMLElement | null;
		const listId = parent?.id ?? parent?.dataset?.['dropListId'] ?? '';
		const siblings = parent
			? Array.from(parent.children).filter((el) => (el as HTMLElement).dataset['cdkDrag'] !== undefined)
			: [];
		const index = siblings.indexOf(this.el.nativeElement);

		dragState.activeItem = {
			data: this.data,
			sourceListId: listId,
			sourceIndex: index >= 0 ? index : 0,
		};

		this.el.nativeElement.classList.add('cdk-drag-dragging');

		// Necesario para Firefox
		event.dataTransfer?.setData('text/plain', '');
	}

	onDragEnd(_event: DragEvent): void {
		this.el.nativeElement.classList.remove('cdk-drag-dragging');
		dragState.activeItem = null;
	}
}
// #endregion

// #region CdkDragHandle
@Directive({
	// eslint-disable-next-line @angular-eslint/directive-selector
	selector: '[cdkDragHandle]',
	standalone: true,
	host: {
		'[style.cursor]': '"grab"',
	},
})
export class CdkDragHandle {
	constructor() {
		// El handle se detecta por el selector en CdkDrag.onDragStart
		inject(ElementRef).nativeElement.setAttribute('cdkdraghandle', '');
	}
}
// #endregion
