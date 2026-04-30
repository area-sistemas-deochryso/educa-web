import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MapaEnvioTabComponent } from './mapa-envio-tab.component';
import {
	BlacklistEntryCreatedEvent,
	CandidatoBlacklistDetectadoEvent,
	DeferFailStatusUpdatedEvent,
} from '../../models/email-monitoreo.models';
import { EmailHubService, EmailMonitoreoFacade } from '../../services';

describe('MapaEnvioTabComponent', () => {
	let fixture: ComponentFixture<MapaEnvioTabComponent>;
	let component: MapaEnvioTabComponent;

	const blacklistEntryCreated$ = new Subject<BlacklistEntryCreatedEvent>();
	const deferFailStatusUpdated$ = new Subject<DeferFailStatusUpdatedEvent>();
	const candidatoBlacklistDetectado$ = new Subject<CandidatoBlacklistDetectadoEvent>();

	const hubMock: Partial<EmailHubService> = {
		blacklistEntryCreated$: blacklistEntryCreated$.asObservable(),
		deferFailStatusUpdated$: deferFailStatusUpdated$.asObservable(),
		candidatoBlacklistDetectado$: candidatoBlacklistDetectado$.asObservable(),
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		connected: () => false,
	} as unknown as Partial<EmailHubService>;

	const facadeMock: Partial<EmailMonitoreoFacade> = {
		loadAll: vi.fn(),
		startHub: vi.fn().mockResolvedValue(undefined),
		stopHub: vi.fn().mockResolvedValue(undefined),
		setGranularidad: vi.fn(),
		vm: () => ({
			filters: { ventanaDias: 7, granularidad: 'hour', topLimit: 10 },
			deferFailStatus: null,
			deferFailLoading: false,
			senderStats: [],
			senderLoading: false,
			topDestinatarios: [],
			topLoading: false,
			serieTemporal: [],
			serieLoading: false,
			dominios: [],
			dominiosLoading: false,
			candidatos: [],
			candidatosLoading: false,
			lastBlacklistEventAt: null,
		}),
		hubConnected: () => false,
	} as unknown as Partial<EmailMonitoreoFacade>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MapaEnvioTabComponent],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: EmailHubService, useValue: hubMock },
				{ provide: EmailMonitoreoFacade, useValue: facadeMock },
			],
		}).compileComponents();
		fixture = TestBed.createComponent(MapaEnvioTabComponent);
		component = fixture.componentInstance;
	});

	it('SignalR mock dispara MessageService.add con severity warn ante BlacklistEntryCreated', () => {
		const messageService = fixture.componentRef.injector.get(MessageService);
		const spy = vi.spyOn(messageService, 'add');

		fixture.detectChanges();

		blacklistEntryCreated$.next({
			correoEnmascarado: 'foo***@gmail.com',
			motivo: 'BOUNCE_5XX',
			origen: 'sync',
		});

		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ severity: 'warn', summary: 'Bloqueo automático' }),
		);
	});

	it('CandidatoBlacklistDetectado dispara toast severity info', () => {
		const messageService = fixture.componentRef.injector.get(MessageService);
		const spy = vi.spyOn(messageService, 'add');

		fixture.detectChanges();

		candidatoBlacklistDetectado$.next({
			correoEnmascarado: 'foo***@gmail.com',
			hitsActuales: 1,
			thresholdHits: 2,
		});

		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ severity: 'info', summary: 'Candidato a blacklist' }),
		);
		expect(component).toBeTruthy();
	});
});
