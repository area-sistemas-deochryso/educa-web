import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
	// eslint-disable-next-line @angular-eslint/directive-selector
	selector: '[cdkDragHandle]',
	standalone: true,
	host: {
		'[style.cursor]': '"grab"',
	},
})
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class CdkDragHandle {
	constructor() {
		// El handle se detecta por el selector en CdkDrag.onDragStart
		inject(ElementRef).nativeElement.setAttribute('cdkdraghandle', '');
	}
}
