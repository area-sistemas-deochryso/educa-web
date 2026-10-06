import { describe, expect, it } from 'vitest';
import { JUSTIFICATION_UPLOAD_ACCEPT, JUSTIFICATION_UPLOAD_LIMITS, UPLOAD_ACCEPT, UPLOAD_LIMITS, validateUploadFile } from './upload-limits';

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

describe('validateUploadFile con límites de justificación', () => {
	const limits = JUSTIFICATION_UPLOAD_LIMITS;

	it('acepta PDF e imágenes dentro de 10 MB', () => {
		expect(validateUploadFile({ name: 'certificado.PDF', size: 1024 }, limits)).toBeNull();
		expect(validateUploadFile({ name: 'foto.webp', size: limits.maxFileSizeBytes }, limits)).toBeNull();
	});

	it('rechaza tipos que el BE de justificaciones no acepta', () => {
		expect(validateUploadFile({ name: 'informe.docx', size: 10 }, limits)).toContain('no permitido');
		expect(validateUploadFile({ name: 'clip.mp4', size: 10 }, limits)).toContain('no permitido');
	});

	it('rechaza archivos sobre 10 MB', () => {
		expect(validateUploadFile({ name: 'a.pdf', size: limits.maxFileSizeBytes + 1 }, limits)).toContain('10 MB');
	});

	it('JUSTIFICATION_UPLOAD_ACCEPT solo lista PDF e imágenes', () => {
		expect(JUSTIFICATION_UPLOAD_ACCEPT).toBe('.pdf,.jpg,.jpeg,.png,.webp');
	});
});
