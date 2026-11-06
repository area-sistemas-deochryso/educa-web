// #region Imports
import { describe, expect, it } from 'vitest';

import { FileUploadBuilder } from './file-upload.builder';
// #endregion

// #region Tests
describe('FileUploadBuilder', () => {
	const file = new File(['contenido'], 'doc.pdf', { type: 'application/pdf' });

	it('create agrega el archivo con su nombre', () => {
		const sent = FileUploadBuilder.create(file).build().get('file') as File;
		expect(sent.name).toBe('doc.pdf');
		expect(sent.size).toBe(file.size);
	});

	it('container agrega containerName', () => {
		const fd = FileUploadBuilder.create(file).container('curso-contenido').build();
		expect(fd.get('containerName')).toBe('curso-contenido');
	});

	it('withTimestamp es true por defecto y acepta false', () => {
		expect(FileUploadBuilder.create(file).withTimestamp().build().get('appendTimestamp')).toBe('true');
		expect(FileUploadBuilder.create(file).withTimestamp(false).build().get('appendTimestamp')).toBe('false');
	});

	it('es encadenable y devuelve la misma instancia', () => {
		const b = FileUploadBuilder.create(file);
		expect(b.container('c')).toBe(b);
		expect(b.withTimestamp()).toBe(b);
		expect(b.fromConfig({ containerName: 'c' })).toBe(b);
	});

	describe('fromConfig', () => {
		it('appendTimestamp true → "true"', () => {
			const fd = FileUploadBuilder.create(file)
				.fromConfig({ containerName: 'a', appendTimestamp: true })
				.build();
			expect(fd.get('containerName')).toBe('a');
			expect(fd.get('appendTimestamp')).toBe('true');
		});

		it('appendTimestamp false → no agrega el campo', () => {
			const fd = FileUploadBuilder.create(file)
				.fromConfig({ containerName: 'a', appendTimestamp: false })
				.build();
			expect(fd.has('appendTimestamp')).toBe(false);
		});

		it('appendTimestamp omitido → agrega "false" explícito', () => {
			const fd = FileUploadBuilder.create(file).fromConfig({ containerName: 'a' }).build();
			expect(fd.get('appendTimestamp')).toBe('false');
		});
	});
});
// #endregion
