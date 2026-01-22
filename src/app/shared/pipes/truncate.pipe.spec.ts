import { describe, it, expect } from 'vitest';
import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
	let pipe: TruncatePipe;

	beforeEach(() => {
		pipe = new TruncatePipe();
	});

	it('should create an instance', () => {
		expect(pipe).toBeTruthy();
	});

	describe('transform', () => {
		it('should return empty string for null/undefined value', () => {
			expect(pipe.transform(null as any)).toBe('');
			expect(pipe.transform(undefined as any)).toBe('');
			expect(pipe.transform('')).toBe('');
		});

		it('should not truncate if string is shorter than limit', () => {
			const input = 'Hello World';
			expect(pipe.transform(input, 100)).toBe('Hello World');
		});

		it('should not truncate if string equals limit', () => {
			const input = '12345';
			expect(pipe.transform(input, 5)).toBe('12345');
		});

		it('should truncate with default limit (100) and trail', () => {
			const input = 'a'.repeat(150);
			const result = pipe.transform(input);
			expect(result.length).toBe(103); // 100 + '...'
			expect(result.endsWith('...')).toBe(true);
		});

		it('should truncate with custom limit', () => {
			const input = 'Hello World, this is a test string';
			const result = pipe.transform(input, 10);
			expect(result).toBe('Hello Worl...');
		});

		it('should truncate with custom trail', () => {
			const input = 'Hello World, this is a test string';
			const result = pipe.transform(input, 10, '>>>');
			expect(result).toBe('Hello Worl>>>');
		});

		it('should truncate with empty trail', () => {
			const input = 'Hello World';
			const result = pipe.transform(input, 5, '');
			expect(result).toBe('Hello');
		});

		it('should handle very short limit', () => {
			const input = 'Hello World';
			const result = pipe.transform(input, 1);
			expect(result).toBe('H...');
		});

		it('should handle limit of 0', () => {
			const input = 'Hello World';
			const result = pipe.transform(input, 0);
			expect(result).toBe('...');
		});
	});
});
