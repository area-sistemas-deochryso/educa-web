import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
