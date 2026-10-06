import { FileViewerService } from '@shared/components';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SemanaEstudianteArchivosDto } from '@features/intranet/pages/profesor/models';
import { StudentFilesDialogComponent } from './student-files-dialog.component';

const data = [
	{
		semanaId: 1,
		numeroSemana: 1,
		titulo: 'Intro',
		estudiantes: [
			{
				estudianteId: 5,
				estudianteNombre: 'Ana Pérez',
				archivos: [
					{
						id: 1,
						nombreArchivo: 'entrega.docx',
						urlArchivo: 'https://blob/entrega.docx',
						tipoArchivo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
						tamanoBytes: 4096,
						fechaReg: '2026-10-01T10:00:00',
					},
				],
			},
		],
	},
] as unknown as SemanaEstudianteArchivosDto[];

describe('StudentFilesDialogComponent', () => {
	let fixture: ComponentFixture<StudentFilesDialogComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [StudentFilesDialogComponent] });
		fixture = TestBed.createComponent(StudentFilesDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('data', data);
		fixture.detectChanges();
		fixture.componentInstance.toggleWeek(1);
		fixture.detectChanges();
	});

	afterEach(() => vi.restoreAllMocks());

	const rowEls = () => document.body.querySelectorAll('app-file-row');

	it('renderiza la entrega con app-file-row e ícono por tipo real', () => {
		expect(rowEls().length).toBe(1);
		expect(rowEls()[0].querySelector('.file-row__icon--word')).not.toBeNull();
		expect(rowEls()[0].textContent).toContain('entrega.docx');
	});

	it('conserva la fecha de registro en el slot de acciones', () => {
		expect(rowEls()[0].querySelector('.file-date')?.textContent).toContain('01/10/2026');
	});

	it('(open) delega en el visor compartido con name y url del archivo', () => {
		const openSpy = vi.spyOn(TestBed.inject(FileViewerService), 'open').mockImplementation(() => undefined);
		(rowEls()[0].querySelector('.file-row__info') as HTMLButtonElement).click();
		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'entrega.docx', url: 'https://blob/entrega.docx' }));
	});
});
