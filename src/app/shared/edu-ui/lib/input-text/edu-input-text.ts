import { Directive } from '@angular/core';

@Directive({
	selector: 'input[eduInputText]',
	standalone: true,
	host: { class: 'edu-input-text' },
})
export class EduInputText {}
