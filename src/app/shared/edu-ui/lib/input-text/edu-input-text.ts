import { Directive } from '@angular/core';
import { EduShakeOnInvalid } from '../shake-on-invalid/edu-shake-on-invalid';

@Directive({
	selector: 'input[eduInputText]',
	standalone: true,
	host: { class: 'edu-input-text' },
	hostDirectives: [EduShakeOnInvalid],
})
export class EduInputText {}
