import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorHandlerService } from '@core/services';
import { JUSTIFICATION_UPLOAD_LIMITS } from '@shared/components';
import { HealthJustificationDialogComponent } from './health-justification-dialog.component';

describe('HealthJustificationDialogComponent', () => {
	let fixture: ComponentFixture<HealthJustificationDialogComponent>;
	let component: HealthJustificationDialogComponent;
	const errorHandler = { showWarning: vi.fn() };

	const file = (name: string, size = 1024, type = 'application/pdf') => new File([new Uint8Array(size)], name, { type });
	const select = (f: File) => component.onFileSelect({ files: [f] });

	beforeEach(() => {
		vi.clearAllMocks();
		TestBed.configureTestingModule({
			imports: [HealthJustificationDialogComponent],
			providers: [{ provide: ErrorHandlerService, useValue: errorHandler }],
		});
		fixture = TestBed.createComponent(HealthJustificationDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('salonId', 1);
		fixture.detectChanges();
		component = fixture.componentInstance;
	});

	it('rechaza un tipo no permitido con aviso y no lo adjunta', () => {
		select(file('informe.docx'));
		expect(errorHandler.showWarning).toHaveBeenCalledWith('Archivo no válido', 'Tipo de archivo no permitido.');
		expect(component.selectedFile()).toBeNull();
	});

	it('rechaza un archivo sobre 10 MB con aviso y no lo adjunta', () => {
		select(file('scan.pdf', JUSTIFICATION_UPLOAD_LIMITS.maxFileSizeBytes + 1));
		expect(errorHandler.showWarning).toHaveBeenCalledWith('Archivo no válido', 'El archivo supera el tamaño máximo de 10 MB.');
		expect(component.selectedFile()).toBeNull();
	});

	it('muestra un archivo válido como app-file-row y permite quitarlo', () => {
		select(file('certificado.pdf', 2048));
		fixture.detectChanges();
		const row = (fixture.nativeElement as HTMLElement).ownerDocument.querySelector('app-file-row');
		expect(errorHandler.showWarning).not.toHaveBeenCalled();
		expect(component.selectedFile()?.name).toBe('certificado.pdf');
		expect(row?.textContent).toContain('certificado.pdf');
		expect(row?.textContent).toContain('2 KB');

		component.onFileClear();
		fixture.detectChanges();
		expect(component.selectedFile()).toBeNull();
	});
});
