import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { CandidatosBlacklistTileComponent } from './candidatos-blacklist-tile.component';

describe('CandidatosBlacklistTileComponent', () => {
	let fixture: ComponentFixture<CandidatosBlacklistTileComponent>;
	let component: CandidatosBlacklistTileComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CandidatosBlacklistTileComponent],
			providers: [provideRouter([])],
		}).compileComponents();
		fixture = TestBed.createComponent(CandidatosBlacklistTileComponent);
		component = fixture.componentInstance;
	});

	it('queryParamsFor genera prefill correcto para CTA Bloquear', () => {
		const params = component.queryParamsFor('full@gmail.com');
		expect(params).toEqual({ action: 'add', correo: 'full@gmail.com' });
	});

	it('hasData reacciona correctamente a items', () => {
		fixture.componentRef.setInput('items', []);
		fixture.detectChanges();
		expect(component.hasData()).toBe(false);

		fixture.componentRef.setInput('items', [
			{ destinatario: 'a@b.com', hits: 2, ultimoHit: '2026-04-30T10:00:00' },
		]);
		fixture.detectChanges();
		expect(component.hasData()).toBe(true);
	});
});
