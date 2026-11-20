import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EduDialog } from './edu-dialog';

@Component({
	standalone: true,
	imports: [EduDialog],
	template: `
		<edu-dialog #dlg [(visible)]="visible" [dirty]="dirty()" header="Formulario">
			<p>Contenido</p>
			<ng-template #footer>
				<button type="button" class="cancel" (click)="dlg.requestClose()">Cancelar</button>
			</ng-template>
		</edu-dialog>
	`,
})
class HostComponent {
	readonly visible = signal(true);
	readonly dirty = signal(false);
}

describe('EduDialog — cierre con cambios sin guardar', () => {
	async function render() {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
		fixture.detectChanges();
		await fixture.whenStable();
	};

	const q = (selector: string) => document.querySelector<HTMLElement>(selector);
	const clickConfirm = (label: string) =>
		Array.from(document.querySelectorAll<HTMLElement>('.edu-dialog-confirm edu-button'))
			.find((b) => b.textContent?.trim() === label)
			?.click();

	beforeEach(() => TestBed.configureTestingModule({}));
	afterEach(() => TestBed.resetTestingModule());

	it('closes right away on X when the form has no changes', async () => {
		const fixture = await render();

		q('.edu-dialog-header__close')?.click();
		await settle(fixture);

		expect(fixture.componentInstance.visible()).toBe(false);
		expect(q('.edu-dialog-confirm')).toBeNull();
	});

	it('asks before closing on X when the form is dirty and stays open', async () => {
		const fixture = await render();
		fixture.componentInstance.dirty.set(true);
		await settle(fixture);

		q('.edu-dialog-header__close')?.click();
		await settle(fixture);

		expect(fixture.componentInstance.visible()).toBe(true);
		expect(q('.edu-dialog-confirm')).not.toBeNull();
	});

	it('asks before closing when a footer Cancelar goes through requestClose()', async () => {
		const fixture = await render();
		fixture.componentInstance.dirty.set(true);
		await settle(fixture);

		q('.cancel')?.click();
		await settle(fixture);

		expect(fixture.componentInstance.visible()).toBe(true);
		expect(q('.edu-dialog-confirm')).not.toBeNull();
	});

	it('keeps the dialog open and drops the prompt on «Quedarme»', async () => {
		const fixture = await render();
		fixture.componentInstance.dirty.set(true);
		await settle(fixture);
		q('.edu-dialog-header__close')?.click();
		await settle(fixture);

		clickConfirm('Quedarme');
		await settle(fixture);

		expect(fixture.componentInstance.visible()).toBe(true);
		expect(q('.edu-dialog-confirm')).toBeNull();
	});

	it('closes and discards on «Salir sin guardar»', async () => {
		const fixture = await render();
		fixture.componentInstance.dirty.set(true);
		await settle(fixture);
		q('.edu-dialog-header__close')?.click();
		await settle(fixture);

		clickConfirm('Salir sin guardar');
		await settle(fixture);

		expect(fixture.componentInstance.visible()).toBe(false);
	});

	it('does not close on a backdrop click even with changes', async () => {
		const fixture = await render();
		fixture.componentInstance.dirty.set(true);
		await settle(fixture);

		q('.cdk-overlay-backdrop')?.click();
		await settle(fixture);

		expect(fixture.componentInstance.visible()).toBe(true);
		expect(q('.edu-dialog-confirm')).toBeNull();
	});
});

describe('EduDialog — entrada, salida y hoja inferior', () => {
	const LEAVE_MS = 200;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		TestBed.resetTestingModule();
	});

	const q = (selector: string) => document.querySelector<HTMLElement>(selector);

	// jsdom no resuelve la transición del SCSS: se fija inline para que el handle espere la salida.
	const withLeaveTransition = () => {
		q('.edu-dialog-panel')?.style.setProperty('transition-duration', `${LEAVE_MS}ms`);
	};

	const settle = (fixture: { detectChanges(): void }) => {
		fixture.detectChanges();
		TestBed.tick();
		fixture.detectChanges();
	};

	const render = () => {
		const fixture = TestBed.createComponent(HostComponent);
		settle(fixture);
		return fixture;
	};

	it('opens with the accessible dialog attributes', () => {
		render();

		const panel = q('.edu-dialog-panel');
		expect(panel?.getAttribute('role')).toBe('dialog');
		expect(panel?.getAttribute('aria-modal')).toBe('true');
		expect(panel?.getAttribute('aria-label')).toBe('Formulario');
	});

	it('keeps the panel until the leave transition ends and then removes it', async () => {
		const fixture = render();
		withLeaveTransition();

		fixture.componentInstance.visible.set(false);
		settle(fixture);
		expect(q('.edu-dialog-panel')).not.toBeNull();
		expect(q('.edu-dialog-panel')?.hasAttribute('data-open')).toBe(false);

		await vi.advanceTimersByTimeAsync(LEAVE_MS + 100);
		expect(q('.edu-dialog-panel')).toBeNull();
	});

	it('does not remove the reopened dialog when the earlier leave finishes', async () => {
		const fixture = render();
		withLeaveTransition();

		fixture.componentInstance.visible.set(false);
		settle(fixture);
		fixture.componentInstance.visible.set(true);
		settle(fixture);
		await vi.advanceTimersByTimeAsync(LEAVE_MS + 100);

		expect(document.querySelectorAll('.edu-dialog-panel')).toHaveLength(1);
		expect(q('.edu-dialog-panel')?.getAttribute('role')).toBe('dialog');
	});

	it('renders as a bottom sheet on a narrow viewport and centered on a wide one', () => {
		const original = window.matchMedia;
		try {
			window.matchMedia = ((query: string) => ({ matches: true, media: query })) as typeof window.matchMedia;
			render();
			expect(q('.edu-dialog-panel')?.classList.contains('edu-dialog-panel--sheet')).toBe(true);
			TestBed.resetTestingModule();
			document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());

			window.matchMedia = ((query: string) => ({ matches: false, media: query })) as typeof window.matchMedia;
			TestBed.configureTestingModule({});
			render();
			expect(q('.edu-dialog-panel')?.classList.contains('edu-dialog-panel--sheet')).toBe(false);
		} finally {
			window.matchMedia = original;
		}
	});

	it('adds the blur class to the backdrop', () => {
		render();

		expect(q('.cdk-overlay-backdrop')?.classList.contains('edu-dialog-backdrop')).toBe(true);
	});
});
