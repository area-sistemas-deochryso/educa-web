import { Directive, ElementRef, inject, Input, OnInit } from '@angular/core';
import { dragState } from './drag-drop.models';

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
