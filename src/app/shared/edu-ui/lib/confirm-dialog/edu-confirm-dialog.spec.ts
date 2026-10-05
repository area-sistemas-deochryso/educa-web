import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EduConfirmDialog } from './edu-confirm-dialog';
import { EduConfirmationService } from './edu-confirmation.service';

describe('EduConfirmDialog', () => {
	let service: EduConfirmationService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(EduConfirmationService);
	});

	async function render() {
		const fixture = TestBed.createComponent(EduConfirmDialog);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	const buttons = () =>
		Array.from(document.querySelectorAll<HTMLElement>('.edu-confirm-dialog__footer edu-button')).map((b) =>
			b.textContent?.trim(),
		);
	const click = (label: string) =>
		Array.from(document.querySelectorAll<HTMLElement>('.edu-confirm-dialog__footer edu-button'))
			.find((b) => b.textContent?.trim() === label)
			?.click();

	it('renders reject and accept by default', async () => {
		const fixture = await render();

		service.confirm({ message: 'm', acceptLabel: 'Sí', rejectLabel: 'No' });
		fixture.detectChanges();
		await fixture.whenStable();

		expect(buttons()).toEqual(['No', 'Sí']);
	});

	it('renders the alternate action between reject and accept', async () => {
		const fixture = await render();

		service.confirm({ message: 'm', acceptLabel: 'Guardar y salir', alternateLabel: 'Salir sin guardar', rejectLabel: 'Quedarme' });
		fixture.detectChanges();
		await fixture.whenStable();

		expect(buttons()).toEqual(['Quedarme', 'Salir sin guardar', 'Guardar y salir']);
	});

	it('runs only the alternate callback and closes when it is clicked', async () => {
		const fixture = await render();
		const accept = vi.fn();
		const alternate = vi.fn();
		const dismiss = vi.fn();
		service.confirm({ message: 'm', alternateLabel: 'Salir sin guardar', accept, alternate, dismiss });
		fixture.detectChanges();
		await fixture.whenStable();

		click('Salir sin guardar');

		expect(alternate).toHaveBeenCalledOnce();
		expect(accept).not.toHaveBeenCalled();
		expect(dismiss).not.toHaveBeenCalled();
		expect(service.confirmation()).toBeNull();
	});

	it('does not call dismiss after accept or reject', async () => {
		const fixture = await render();
		const dismiss = vi.fn();
		service.confirm({ message: 'm', acceptLabel: 'Sí', rejectLabel: 'No', dismiss });
		fixture.detectChanges();
		await fixture.whenStable();

		click('Sí');

		expect(dismiss).not.toHaveBeenCalled();
	});

	it('calls dismiss when the dialog is closed without choosing (X / ESC)', async () => {
		const fixture = await render();
		const dismiss = vi.fn();
		const reject = vi.fn();
		service.confirm({ message: 'm', reject, dismiss });
		fixture.detectChanges();
		await fixture.whenStable();

		document.querySelector<HTMLButtonElement>('.edu-dialog-header__close')?.click();
		fixture.detectChanges();

		expect(dismiss).toHaveBeenCalledOnce();
		expect(reject).not.toHaveBeenCalled();
		expect(service.confirmation()).toBeNull();
	});
});
