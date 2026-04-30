import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { TopDestinatariosTileComponent } from './top-destinatarios-tile.component';

describe('TopDestinatariosTileComponent', () => {
	let fixture: ComponentFixture<TopDestinatariosTileComponent>;
	let component: TopDestinatariosTileComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TopDestinatariosTileComponent],
			providers: [provideRouter([])],
		}).compileComponents();
		fixture = TestBed.createComponent(TopDestinatariosTileComponent);
		component = fixture.componentInstance;
	});

	it('queryParamsFor emite { action: add, correo } para CTA Bloquear', () => {
		const params = component.queryParamsFor('foo@gmail.com');
		expect(params).toEqual({ action: 'add', correo: 'foo@gmail.com' });
	});

	it('hasData reacciona al input items', () => {
		fixture.componentRef.setInput('items', []);
		fixture.detectChanges();
		expect(component.hasData()).toBe(false);

		fixture.componentRef.setInput('items', [
			{
				destinatario: 'foo@gmail.com',
				hitsFallidos: 5,
				diasConFalla: 3,
				mailboxFull: 4,
				otros5xx: 1,
				yaBlacklisteado: false,
			},
		]);
		fixture.detectChanges();
		expect(component.hasData()).toBe(true);
	});
});
