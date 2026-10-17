import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';
import { describeUploadLimits } from '@shared/components';
import { CursoHubContextService } from '@intranet-shared/components';
import { TareasPendientesService } from '@intranet-shared/services';
import { EstudianteCursosFacade } from '@features/intranet/pages/estudiante/services/estudiante-cursos.facade';
import { EstudianteCursoHubContenidoComponent } from './estudiante-curso-hub-contenido.component';

type HubSlot = NonNullable<ReturnType<CursoHubContextService['slot']>>;

const SEMANAS = [
	{
		id: 10,
		numeroSemana: 1,
		titulo: 'Fracciones',
		archivos: [],
		tareas: [{ id: 100, titulo: 'Ejercicios', fechaLimite: null, archivos: [] }],
	},
];

describe('EstudianteCursoHubContenidoComponent — aviso de formatos de subida', () => {
	beforeEach(() => {
		const facade = {
			vm: signal({ contentLoading: false, contenido: { id: 8 }, semanas: SEMANAS, misArchivos: {}, misTareaArchivos: {} }),
			loadMisArchivos: vi.fn(),
			loadMisTareaArchivos: vi.fn(),
			uploadArchivo: vi.fn(),
			uploadTareaArchivo: vi.fn(),
		};
		TestBed.configureTestingModule({
			providers: [
				{ provide: TareasPendientesService, useValue: { nuevasIds: signal(new Set<number>()), marcarVista: vi.fn() } },
				{ provide: EstudianteCursosFacade, useValue: facade },
				{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } },
			],
		});
		TestBed.inject(CursoHubContextService).bind(signal<HubSlot | null>({ id: 1 } as HubSlot));
	});

	it('muestra el aviso junto a «Subir a la semana» y a «Subir entrega», asociado a cada control', () => {
		const fixture = TestBed.createComponent(EstudianteCursoHubContenidoComponent);
		fixture.detectChanges();
		((fixture.nativeElement as HTMLElement).querySelector('button.edu-accordion-header') as HTMLButtonElement).click();
		fixture.detectChanges();

		const uploads = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('edu-file-upload'));
		expect(uploads).toHaveLength(2);
		for (const upload of uploads) {
			const hint = upload.querySelector('.edu-file-upload__hint') as HTMLElement;
			expect(hint.textContent?.trim()).toBe(describeUploadLimits());
			expect(upload.querySelector('button')?.getAttribute('aria-describedby')).toBe(hint.id);
		}
	});
});
