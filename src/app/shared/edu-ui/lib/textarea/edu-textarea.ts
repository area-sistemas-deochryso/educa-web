import { Directive } from '@angular/core';

@Directive({
	selector: 'textarea[eduTextarea]',
	standalone: true,
	host: { class: 'edu-textarea' },
})
export class EduTextarea {}
