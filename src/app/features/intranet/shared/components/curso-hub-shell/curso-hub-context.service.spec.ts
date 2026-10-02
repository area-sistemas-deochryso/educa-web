// #region Imports
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import { CursoHubContextService } from './curso-hub-context.service';
// #endregion

describe('CursoHubContextService', () => {
	const MON = { id: 1 } as HorarioProfesorDto;
	const WED = { id: 2 } as HorarioProfesorDto;
	let ctx: CursoHubContextService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		ctx = TestBed.inject(CursoHubContextService);
	});

	it('has no slot before a shell binds', () => {
		expect(ctx.slot()).toBeNull();
	});

	it('follows the slot resolved by the bound shell', () => {
		const resolved = signal<HorarioProfesorDto | null>(MON);
		ctx.bind(resolved);
		expect(ctx.slot()).toBe(MON);

		resolved.set(WED);
		expect(ctx.slot()).toBe(WED);
	});

	it('clears the slot when the bound shell is destroyed', () => {
		const resolved = signal<HorarioProfesorDto | null>(MON);
		ctx.bind(resolved);
		ctx.unbind(resolved);
		expect(ctx.slot()).toBeNull();
	});

	it('does not clear the slot of a newer shell when an older one unbinds late', () => {
		const older = signal<HorarioProfesorDto | null>(MON);
		const newer = signal<HorarioProfesorDto | null>(WED);
		ctx.bind(older);
		ctx.bind(newer);

		ctx.unbind(older);

		expect(ctx.slot()).toBe(WED);
	});
});
