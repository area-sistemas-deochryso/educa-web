import { TestBed } from '@angular/core/testing';
import { EduConfirmationService } from '@edu-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnsavedChangesPromptService } from './unsaved-changes-prompt.service';

describe('UnsavedChangesPromptService', () => {
	let confirmation: EduConfirmationService;
	let prompt: UnsavedChangesPromptService;
	const save = vi.fn<() => Promise<boolean>>();

	beforeEach(() => {
		save.mockReset();
		TestBed.configureTestingModule({ providers: [EduConfirmationService, UnsavedChangesPromptService] });
		confirmation = TestBed.inject(EduConfirmationService);
		prompt = TestBed.inject(UnsavedChangesPromptService);
	});

	const ask = (canSave: boolean) => prompt.confirmProceed({ message: 'Tienes cambios.', canSave, save });

	describe('when the edits can be saved', () => {
		it('offers save / discard / stay', () => {
			void ask(true);

			const options = confirmation.confirmation();
			expect(options?.header).toBe('Cambios sin guardar');
			expect(options?.message).toBe('Tienes cambios.');
			expect(options?.acceptLabel).toBe('Guardar y salir');
			expect(options?.alternateLabel).toBe('Salir sin guardar');
			expect(options?.rejectLabel).toBe('Quedarme');
		});

		it('proceeds after saving successfully', async () => {
			save.mockResolvedValue(true);
			const result = ask(true);

			confirmation.confirmation()?.accept?.();

			await expect(result).resolves.toBe(true);
			expect(save).toHaveBeenCalledOnce();
		});

		it('stays when the save is not confirmed', async () => {
			save.mockResolvedValue(false);
			const result = ask(true);

			confirmation.confirmation()?.accept?.();

			await expect(result).resolves.toBe(false);
		});

		it('stays when the save throws', async () => {
			save.mockRejectedValue(new Error('boom'));
			const result = ask(true);

			confirmation.confirmation()?.accept?.();

			await expect(result).resolves.toBe(false);
		});

		it('proceeds without saving when the user discards', async () => {
			const result = ask(true);

			confirmation.confirmation()?.alternate?.();

			await expect(result).resolves.toBe(true);
			expect(save).not.toHaveBeenCalled();
		});
	});

	describe('when the edits cannot be saved from here', () => {
		it('only offers discard / stay', () => {
			void ask(false);

			const options = confirmation.confirmation();
			expect(options?.acceptLabel).toBe('Salir sin guardar');
			expect(options?.alternateLabel).toBeUndefined();
			expect(options?.rejectLabel).toBe('Quedarme');
		});

		it('proceeds when the user discards', async () => {
			const result = ask(false);

			confirmation.confirmation()?.accept?.();

			await expect(result).resolves.toBe(true);
			expect(save).not.toHaveBeenCalled();
		});
	});

	it.each([
		['Quedarme', (c: EduConfirmationService) => c.confirmation()?.reject?.()],
		['closing with X / ESC', (c: EduConfirmationService) => c.confirmation()?.dismiss?.()],
	])('stays on %s', async (_label, act) => {
		const result = ask(true);

		act(confirmation);

		await expect(result).resolves.toBe(false);
		expect(save).not.toHaveBeenCalled();
	});
});
