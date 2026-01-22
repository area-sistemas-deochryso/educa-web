import { FormControl, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { AppValidators } from './validators';

describe('AppValidators', () => {
	describe('dni', () => {
		const validator = AppValidators.dni();

		it('should return null for valid 8-digit DNI', () => {
			const control = new FormControl('12345678');
			expect(validator(control)).toBeNull();
		});

		it('should return error for DNI with less than 8 digits', () => {
			const control = new FormControl('1234567');
			expect(validator(control)).toEqual({ dni: true });
		});

		it('should return error for DNI with more than 8 digits', () => {
			const control = new FormControl('123456789');
			expect(validator(control)).toEqual({ dni: true });
		});

		it('should return error for DNI with letters', () => {
			const control = new FormControl('1234567A');
			expect(validator(control)).toEqual({ dni: true });
		});

		it('should return null for empty value', () => {
			const control = new FormControl('');
			expect(validator(control)).toBeNull();
		});
	});

	describe('password', () => {
		const validator = AppValidators.password(6);

		it('should return null for valid password', () => {
			const control = new FormControl('abc123');
			expect(validator(control)).toBeNull();
		});

		it('should return minLength error for short password', () => {
			const control = new FormControl('ab1');
			const result = validator(control);
			expect(result?.['password']?.['minLength']).toBeDefined();
		});

		it('should return noLetter error for password without letters', () => {
			const control = new FormControl('123456');
			const result = validator(control);
			expect(result?.['password']?.['noLetter']).toBe(true);
		});

		it('should return noNumber error for password without numbers', () => {
			const control = new FormControl('abcdef');
			const result = validator(control);
			expect(result?.['password']?.['noNumber']).toBe(true);
		});

		it('should return null for empty value', () => {
			const control = new FormControl('');
			expect(validator(control)).toBeNull();
		});
	});

	describe('strongPassword', () => {
		const validator = AppValidators.strongPassword();

		it('should return null for strong password', () => {
			const control = new FormControl('Abc123!@');
			expect(validator(control)).toBeNull();
		});

		it('should return minLength error for short password', () => {
			const control = new FormControl('Ab1!');
			const result = validator(control);
			expect(result?.['strongPassword']?.['minLength']).toBe(true);
		});

		it('should return noUppercase error', () => {
			const control = new FormControl('abcd123!');
			const result = validator(control);
			expect(result?.['strongPassword']?.['noUppercase']).toBe(true);
		});

		it('should return noLowercase error', () => {
			const control = new FormControl('ABCD123!');
			const result = validator(control);
			expect(result?.['strongPassword']?.['noLowercase']).toBe(true);
		});

		it('should return noSpecial error', () => {
			const control = new FormControl('Abcd1234');
			const result = validator(control);
			expect(result?.['strongPassword']?.['noSpecial']).toBe(true);
		});
	});

	describe('email', () => {
		const validator = AppValidators.email();

		it('should return null for valid email', () => {
			const control = new FormControl('test@example.com');
			expect(validator(control)).toBeNull();
		});

		it('should return error for email without @', () => {
			const control = new FormControl('testexample.com');
			expect(validator(control)).toEqual({ email: true });
		});

		it('should return error for email without domain', () => {
			const control = new FormControl('test@');
			expect(validator(control)).toEqual({ email: true });
		});

		it('should return error for email without TLD', () => {
			const control = new FormControl('test@example');
			expect(validator(control)).toEqual({ email: true });
		});

		it('should return null for empty value', () => {
			const control = new FormControl('');
			expect(validator(control)).toBeNull();
		});
	});

	describe('phoneNumber', () => {
		const validator = AppValidators.phoneNumber();

		it('should return null for valid Peruvian phone (starts with 9, 9 digits)', () => {
			const control = new FormControl('987654321');
			expect(validator(control)).toBeNull();
		});

		it('should return error for phone not starting with 9', () => {
			const control = new FormControl('123456789');
			expect(validator(control)).toEqual({ phoneNumber: true });
		});

		it('should return error for phone with less than 9 digits', () => {
			const control = new FormControl('98765432');
			expect(validator(control)).toEqual({ phoneNumber: true });
		});

		it('should return error for phone with more than 9 digits', () => {
			const control = new FormControl('9876543210');
			expect(validator(control)).toEqual({ phoneNumber: true });
		});

		it('should return null for empty value', () => {
			const control = new FormControl('');
			expect(validator(control)).toBeNull();
		});
	});

	describe('matchFields', () => {
		it('should return null when fields match', () => {
			const group = new FormGroup({
				password: new FormControl('abc123'),
				confirmPassword: new FormControl('abc123'),
			});
			const validator = AppValidators.matchFields('password', 'confirmPassword');
			expect(validator(group)).toBeNull();
		});

		it('should return mismatch error when fields do not match', () => {
			const group = new FormGroup({
				password: new FormControl('abc123'),
				confirmPassword: new FormControl('abc456'),
			});
			const validator = AppValidators.matchFields('password', 'confirmPassword');
			expect(validator(group)).toEqual({
				mismatch: { field1: 'password', field2: 'confirmPassword' },
			});
		});

		it('should return null if one field is empty', () => {
			const group = new FormGroup({
				password: new FormControl('abc123'),
				confirmPassword: new FormControl(''),
			});
			const validator = AppValidators.matchFields('password', 'confirmPassword');
			expect(validator(group)).toBeNull();
		});
	});

	describe('required', () => {
		it('should return null for non-empty value', () => {
			const control = new FormControl('test');
			const validator = AppValidators.required('campo');
			expect(validator(control)).toBeNull();
		});

		it('should return error for empty string', () => {
			const control = new FormControl('');
			const validator = AppValidators.required('campo');
			expect(validator(control)).toEqual({ required: { fieldName: 'campo' } });
		});

		it('should return error for whitespace only', () => {
			const control = new FormControl('   ');
			const validator = AppValidators.required('campo');
			expect(validator(control)).toEqual({ required: { fieldName: 'campo' } });
		});

		it('should return error for null', () => {
			const control = new FormControl(null);
			const validator = AppValidators.required('campo');
			expect(validator(control)).toEqual({ required: { fieldName: 'campo' } });
		});
	});

	describe('range', () => {
		const validator = AppValidators.range(1, 100);

		it('should return null for value within range', () => {
			const control = new FormControl(50);
			expect(validator(control)).toBeNull();
		});

		it('should return null for min boundary', () => {
			const control = new FormControl(1);
			expect(validator(control)).toBeNull();
		});

		it('should return null for max boundary', () => {
			const control = new FormControl(100);
			expect(validator(control)).toBeNull();
		});

		it('should return error for value below range', () => {
			const control = new FormControl(0);
			expect(validator(control)).toEqual({ range: { min: 1, max: 100, actual: 0 } });
		});

		it('should return error for value above range', () => {
			const control = new FormControl(101);
			expect(validator(control)).toEqual({ range: { min: 1, max: 100, actual: 101 } });
		});

		it('should return error for non-numeric value', () => {
			const control = new FormControl('abc');
			const result = validator(control);
			expect(result?.['range']).toBeDefined();
		});
	});

	describe('onlyLetters', () => {
		const validator = AppValidators.onlyLetters();

		it('should return null for letters only', () => {
			const control = new FormControl('Juan');
			expect(validator(control)).toBeNull();
		});

		it('should return null for letters with spaces', () => {
			const control = new FormControl('Juan Pérez');
			expect(validator(control)).toBeNull();
		});

		it('should return null for letters with accents', () => {
			const control = new FormControl('José María Ñoño');
			expect(validator(control)).toBeNull();
		});

		it('should return error for numbers', () => {
			const control = new FormControl('Juan123');
			expect(validator(control)).toEqual({ onlyLetters: true });
		});

		it('should return error for special characters', () => {
			const control = new FormControl('Juan@');
			expect(validator(control)).toEqual({ onlyLetters: true });
		});

		it('should return null for empty value', () => {
			const control = new FormControl('');
			expect(validator(control)).toBeNull();
		});
	});

	describe('onlyNumbers', () => {
		const validator = AppValidators.onlyNumbers();

		it('should return null for numbers only', () => {
			const control = new FormControl('12345');
			expect(validator(control)).toBeNull();
		});

		it('should return error for letters', () => {
			const control = new FormControl('123abc');
			expect(validator(control)).toEqual({ onlyNumbers: true });
		});

		it('should return error for special characters', () => {
			const control = new FormControl('123-456');
			expect(validator(control)).toEqual({ onlyNumbers: true });
		});

		it('should return null for empty value', () => {
			const control = new FormControl('');
			expect(validator(control)).toBeNull();
		});
	});
});
