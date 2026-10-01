import { describe, expect, it } from 'vitest';
import { UPLOAD_ACCEPT, UPLOAD_LIMITS, validateUploadFile } from './upload-limits';

describe('validateUploadFile', () => {
	it('acepta un archivo permitido dentro del tope', () => {
		expect(validateUploadFile({ name: 'tarea.pdf', size: 1024 })).toBeNull();
		expect(validateUploadFile({ name: 'TAREA.PPTX', size: UPLOAD_LIMITS.maxFileSizeBytes })).toBeNull();
	});

	it('rechaza archivos sobre 100 MB', () => {
		expect(validateUploadFile({ name: 'a.pdf', size: UPLOAD_LIMITS.maxFileSizeBytes + 1 })).toContain('100 MB');
	});

	it('rechaza extensiones fuera de la lista blanca del BE', () => {
		expect(validateUploadFile({ name: 'virus.exe', size: 10 })).toContain('no permitido');
		expect(validateUploadFile({ name: 'sin-extension', size: 10 })).toContain('no permitido');
	});

	it('rechaza nombres de más de 200 caracteres', () => {
		expect(validateUploadFile({ name: 'a'.repeat(200) + '.pdf', size: 10 })).toContain('200');
	});

	it('UPLOAD_ACCEPT contiene xls y ppt', () => {
		expect(UPLOAD_ACCEPT).toContain('.xlsx');
		expect(UPLOAD_ACCEPT).toContain('.ppt');
	});
});
