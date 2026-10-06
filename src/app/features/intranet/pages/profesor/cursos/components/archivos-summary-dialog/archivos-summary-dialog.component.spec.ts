import { FileViewerService } from '@shared/components';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CursoContenidoSemanaDto } from '@features/intranet/pages/profesor/models';
import { ArchivosSummaryDialogComponent } from './archivos-summary-dialog.component';

const semana = {
	id: 1,
	numeroSemana: 1,
	titulo: 'Intro',
	archivos: [
		{ id: 10, nombreArchivo: 'guia.pdf', urlArchivo: 'https://blob/guia.pdf', tipoArchivo: 'application/pdf', tamanoBytes: 2048, fechaReg: '2026-10-01' },
		{ id: 11, nombreArchivo: 'datos.xlsx', urlArchivo: 'https://blob/datos.xlsx', tipoArchivo: null, tamanoBytes: null, fechaReg: '2026-10-01' },
	],
	tareas: [],
} as unknown as CursoContenidoSemanaDto;

describe('ArchivosSummaryDialogComponent', () => {
	let fixture: ComponentFixture<ArchivosSummaryDialogComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [ArchivosSummaryDialogComponent] });
		fixture = TestBed.createComponent(ArchivosSummaryDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('semanas', [semana]);
		fixture.detectChanges();
	});

	afterEach(() => vi.restoreAllMocks());

	const rowEls = () => document.body.querySelectorAll('app-file-row');

	it('renderiza cada archivo con app-file-row', () => {
		expect(rowEls().length).toBe(2);
		expect(rowEls()[0].textContent).toContain('guia.pdf');
	});

	it('(open) delega en el visor compartido con name y url del archivo', () => {
		const openSpy = vi.spyOn(TestBed.inject(FileViewerService), 'open').mockImplementation(() => undefined);
		(rowEls()[0].querySelector('.file-row__info') as HTMLButtonElement).click();
		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'guia.pdf', url: 'https://blob/guia.pdf' }));
	});

	it('ya no expone clasificadores de ícono propios', () => {
		const instance = fixture.componentInstance as unknown as Record<string, unknown>;
		expect(instance['getFileIcon']).toBeUndefined();
		expect(instance['getFileIconClass']).toBeUndefined();
	});
});
