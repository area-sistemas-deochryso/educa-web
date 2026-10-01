import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FileRowComponent } from './file-row.component';

describe('FileRowComponent', () => {
	let fixture: ComponentFixture<FileRowComponent>;
	const el = () => fixture.nativeElement as HTMLElement;

	function render(inputs: Record<string, unknown>): void {
		for (const [key, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(key, value);
		}
		fixture.detectChanges();
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FileRowComponent] });
		fixture = TestBed.createComponent(FileRowComponent);
	});

	it('renderiza nombre, ícono y tamaño por tipo', () => {
		render({ name: 'notas.xlsx', mimeType: 'application/vnd.ms-excel', sizeBytes: 2048 });

		expect(el().querySelector('.file-row__name')?.textContent).toContain('notas.xlsx');
		expect(el().querySelector('.file-row__icon--excel i')?.className).toContain('pi-file-excel');
		expect(el().querySelector('.file-row__size')?.textContent?.trim()).toBe('2 KB');
	});

	it('sin tamaño no renderiza el span de tamaño', () => {
		render({ name: 'a.pdf', sizeBytes: null });

		expect(el().querySelector('.file-row__size')).toBeNull();
	});

	it('clasifica por extensión cuando no hay MIME (xls/ppt cubiertos)', () => {
		render({ name: 'clase.pptx', mimeType: null });

		expect(el().querySelector('.file-row__icon--ppt')).not.toBeNull();
	});

	it('nombre largo se mantiene completo en el DOM (truncado por CSS) y sin romper layout', () => {
		const longName = 'documento-muy-largo-'.repeat(15) + '.pdf';
		render({ name: longName, mimeType: 'application/pdf' });

		expect(el().querySelector('.file-row__name')?.textContent).toContain(longName);
		expect(el().querySelector('.file-row__info')).not.toBeNull();
	});

	it('emite (open) al hacer click en la fila', () => {
		let opened = 0;
		render({ name: 'a.pdf' });
		fixture.componentInstance.open.subscribe(() => opened++);

		(el().querySelector('.file-row__info') as HTMLButtonElement).click();

		expect(opened).toBe(1);
	});

	it('aplica la variante small', () => {
		render({ name: 'a.pdf', small: true });

		expect(el().querySelector('.file-row--small')).not.toBeNull();
	});
});
