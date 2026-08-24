import { Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';

export interface EduPassThroughRoot {
	[attr: string]: unknown;
}

export interface EduPassThrough {
	root?: EduPassThroughRoot;
}

@Directive({
	selector: '[eduPtRoot]',
	standalone: true,
})
export class EduPtRoot {
	private readonly el = inject(ElementRef<HTMLElement>);
	private readonly renderer = inject(Renderer2);
	private appliedKeys: string[] = [];

	readonly eduPtRoot = input<EduPassThroughRoot | undefined>();

	constructor() {
		effect(() => {
			const attrs = this.eduPtRoot();

			for (const key of this.appliedKeys) {
				this.renderer.removeAttribute(this.el.nativeElement, key);
			}
			this.appliedKeys = [];

			if (!attrs) return;

			for (const [key, value] of Object.entries(attrs)) {
				if (value == null || value === false) continue;
				this.renderer.setAttribute(this.el.nativeElement, key, String(value));
				this.appliedKeys.push(key);
			}
		});
	}
}
