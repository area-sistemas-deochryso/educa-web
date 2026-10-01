import { describe, expect, it } from 'vitest';
import { classifyFile, formatFileSize, getFileKindMeta } from './file-type.utils';

describe('classifyFile', () => {
	it.each([
		['application/pdf', 'pdf'],
		['application/msword', 'word'],
		['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'word'],
		['application/vnd.ms-excel', 'excel'],
		['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'excel'],
		['application/vnd.ms-powerpoint', 'ppt'],
		['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'ppt'],
		['image/svg+xml', 'image'],
		['video/webm', 'video'],
		['audio/mpeg', 'audio'],
		['application/x-zip-compressed', 'archive'],
		['application/vnd.rar', 'archive'],
		['application/epub+zip', 'text'],
		['text/plain', 'text'],
	])('MIME %s → %s', (mimeType, kind) => {
		expect(classifyFile({ mimeType })).toBe(kind);
	});

	it.each([
		['informe.XLS', 'excel'],
		['clase.pptx', 'ppt'],
		['foto.jpeg', 'image'],
		['datos.7z', 'archive'],
		['sin-extension', 'other'],
		['raro.xyz', 'other'],
	])('extensión %s → %s', (fileName, kind) => {
		expect(classifyFile({ fileName })).toBe(kind);
	});

	it('MIME gana sobre la extensión; cae a extensión si el MIME es desconocido o vacío', () => {
		expect(classifyFile({ mimeType: 'application/pdf', fileName: 'x.docx' })).toBe('pdf');
		expect(classifyFile({ mimeType: 'application/octet-stream', fileName: 'x.pptx' })).toBe('ppt');
		expect(classifyFile({ mimeType: '', fileName: 'x.xlsx' })).toBe('excel');
	});

	it('sin datos → other con ícono genérico', () => {
		expect(classifyFile({})).toBe('other');
		expect(getFileKindMeta({}).icon).toBe('pi pi-file');
	});
});

describe('formatFileSize', () => {
	it.each([
		[null, '0 B'],
		[undefined, '0 B'],
		[0, '0 B'],
		[512, '512 B'],
		[1536, '1.5 KB'],
		[5 * 1024 * 1024, '5 MB'],
		[100 * 1024 * 1024, '100 MB'],
		[3 * 1024 ** 3, '3 GB'],
	])('%s → %s', (bytes, label) => {
		expect(formatFileSize(bytes)).toBe(label);
	});
});
