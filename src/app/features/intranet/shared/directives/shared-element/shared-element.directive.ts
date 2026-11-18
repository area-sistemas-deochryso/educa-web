import { Directive, ElementRef, HostListener, OnDestroy, effect, inject, input } from '@angular/core';

import { SharedElementService } from '@core/helpers';

/**
 * Marca un elemento como parte de un par origen↔destino que se transforma durante la navegación.
 * Se pone con el mismo id en ambos extremos (ej. tarjeta de la lista y encabezado del detalle).
 * Un click en un enlace dentro del host lo activa; `data-shared-skip` excluye enlaces que van a otro sitio.
 */
@Directive({
	selector: '[appSharedElement]',
	standalone: true,
})
export class SharedElementDirective implements OnDestroy {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	private readonly service = inject(SharedElementService);
	private registeredId: string | null = null;

	readonly appSharedElement = input.required<string | null>();

	constructor() {
		effect(() => {
			const id = this.appSharedElement();
			this.unregister();
			if (id) {
				this.service.register(id, this.host);
				this.registeredId = id;
			}
		});
	}

	@HostListener('click', ['$event'])
	onClick(event: Event): void {
		const id = this.appSharedElement();
		const target = event.target as Element | null;
		if (!id || !target?.closest('a[href]') || target.closest('[data-shared-skip]')) return;
		this.service.activate(id, this.host);
	}

	ngOnDestroy(): void {
		this.unregister();
	}

	private unregister(): void {
		if (this.registeredId) this.service.unregister(this.registeredId, this.host);
		this.registeredId = null;
	}
}
