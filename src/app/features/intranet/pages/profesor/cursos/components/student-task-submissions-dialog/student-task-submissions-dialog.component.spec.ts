import { FileViewerService } from '@shared/components';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EstudianteTareaArchivosGroupDto } from '@features/intranet/pages/profesor/models';
import { StudentTaskSubmissionsDialogComponent } from './student-task-submissions-dialog.component';

const data = [
	{
		estudianteId: 5,
		estudianteNombre: 'Ana Pérez',
		archivos: [
			{ id: 1, nombreArchivo: 'informe.pdf', urlArchivo: 'https://blob/informe.pdf', tipoArchivo: 'application/pdf', tamanoBytes: 1024, fechaReg: '2026-10-01T10:00:00' },
		],
	},
	{ estudianteId: 6, estudianteNombre: 'Luis Gómez', archivos: [] },
] as unknown as EstudianteTareaArchivosGroupDto[];

describe('StudentTaskSubmissionsDialogComponent', () => {
	let fixture: ComponentFixture<StudentTaskSubmissionsDialogComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [StudentTaskSubmissionsDialogComponent] });
		fixture = TestBed.createComponent(StudentTaskSubmissionsDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('data', data);
		fixture.detectChanges();
	});

	afterEach(() => vi.restoreAllMocks());

	const rowEls = () => document.body.querySelectorAll('app-file-row');

	it('renderiza solo las entregas existentes con app-file-row e ícono por tipo real', () => {
		expect(rowEls().length).toBe(1);
		expect(rowEls()[0].querySelector('.file-row__icon--pdf')).not.toBeNull();
	});

	it('conserva la fecha de registro en el slot de acciones', () => {
		expect(rowEls()[0].querySelector('.file-date')?.textContent).toContain('01/10/2026');
	});

	it('(open) delega en el visor compartido con name y url del archivo', () => {
		const openSpy = vi.spyOn(TestBed.inject(FileViewerService), 'open').mockImplementation(() => undefined);
		(rowEls()[0].querySelector('.file-row__info') as HTMLButtonElement).click();
		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'informe.pdf', url: 'https://blob/informe.pdf' }));
	});
});
