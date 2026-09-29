import { describe, expect, it } from 'vitest';

import { hasMissingGuardianEmail } from './usuario-contact.utils';

describe('hasMissingGuardianEmail', () => {
	it('flags a student without guardian email', () => {
		expect(hasMissingGuardianEmail({ rol: 'Estudiante', correoApoderado: undefined })).toBe(true);
	});

	it('flags a student with an empty or whitespace-only guardian email', () => {
		expect(hasMissingGuardianEmail({ rol: 'Estudiante', correoApoderado: '' })).toBe(true);
		expect(hasMissingGuardianEmail({ rol: 'Estudiante', correoApoderado: '   ' })).toBe(true);
	});

	it('does not flag a student with a guardian email', () => {
		expect(hasMissingGuardianEmail({ rol: 'Estudiante', correoApoderado: 'a@b.com' })).toBe(false);
	});

	it('never flags non-student roles', () => {
		expect(hasMissingGuardianEmail({ rol: 'Profesor', correoApoderado: undefined })).toBe(false);
		expect(hasMissingGuardianEmail({ rol: 'Director', correoApoderado: '' })).toBe(false);
	});
});
