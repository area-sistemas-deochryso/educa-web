import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EduFileUpload } from './edu-file-upload';

describe('EduFileUpload hint', () => {
	let fixture: ComponentFixture<EduFileUpload>;
	const el = () => fixture.nativeElement as HTMLElement;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [EduFileUpload] });
		fixture = TestBed.createComponent(EduFileUpload);
	});

	it('no renderiza el aviso ni aria-describedby si no hay hint', () => {
		fixture.detectChanges();
		expect(el().querySelector('.edu-file-upload__hint')).toBeNull();
		expect(el().querySelector('button')?.hasAttribute('aria-describedby')).toBe(false);
	});

	it.each(['basic', 'advanced'] as const)('modo %s: muestra el texto visible y lo asocia al botón con aria-describedby', (mode) => {
		fixture.componentRef.setInput('mode', mode);
		fixture.componentRef.setInput('hint', 'Formatos permitidos: PDF. Tamaño máximo: 100 MB por archivo.');
		fixture.detectChanges();

		const hint = el().querySelector('.edu-file-upload__hint') as HTMLElement;
		expect(hint.textContent).toContain('Formatos permitidos: PDF');
		expect(hint.id).not.toBe('');
		expect(el().querySelector('button.edu-file-upload__choose')?.getAttribute('aria-describedby')).toBe(hint.id);
	});

	it('cada instancia usa un id de aviso distinto', () => {
		const other = TestBed.createComponent(EduFileUpload);
		fixture.componentRef.setInput('hint', 'a');
		other.componentRef.setInput('hint', 'b');
		fixture.detectChanges();
		other.detectChanges();
		const otherHint = (other.nativeElement as HTMLElement).querySelector('.edu-file-upload__hint');
		expect(el().querySelector('.edu-file-upload__hint')?.id).not.toBe(otherHint?.id);
	});
});
