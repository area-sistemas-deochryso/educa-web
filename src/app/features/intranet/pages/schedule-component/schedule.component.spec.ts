// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { ScheduleComponent } from './schedule.component';
import { VoiceRecognitionService, StorageService } from '@core/services';

// #endregion
// #region Implementation
describe('ScheduleComponent', () => {
	let component: ScheduleComponent;
	let fixture: ComponentFixture<ScheduleComponent>;
	let voiceServiceMock: Partial<VoiceRecognitionService>;
	let storageServiceMock: Partial<StorageService>;

	beforeEach(async () => {
		voiceServiceMock = {
			registerModal: vi.fn().mockReturnValue(() => {}),
			onCommand: vi.fn().mockReturnValue(() => {}),
		};

		storageServiceMock = {
			getScheduleModalsState: vi.fn().mockReturnValue({}),
			updateScheduleModalState: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [ScheduleComponent],
			providers: [
				...testProviders,
				{ provide: VoiceRecognitionService, useValue: voiceServiceMock },
				{ provide: StorageService, useValue: storageServiceMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ScheduleComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render without errors', () => {
		expect(fixture.nativeElement).toBeTruthy();
	});

	it('should have all modals closed initially', () => {
		expect(component.showScheduleModal).toBe(false);
		expect(component.showSummaryModal).toBe(false);
		expect(component.showDetailsModal).toBe(false);
		expect(component.showGradesModal).toBe(false);
	});

	it('should have no selected course initially', () => {
		expect(component.selectedCourse).toBeNull();
	});

	it('should open schedule modal', () => {
		component.openScheduleModal();
		expect(component.showScheduleModal).toBe(true);
		expect(storageServiceMock.updateScheduleModalState).toHaveBeenCalledWith('schedule', true);
	});

	it('should close schedule modal', () => {
		component.showScheduleModal = true;
		component.onScheduleModalClose();
		expect(component.showScheduleModal).toBe(false);
		expect(storageServiceMock.updateScheduleModalState).toHaveBeenCalledWith('schedule', false);
	});

	it('should open summary modal', () => {
		component.openSummaryModal();
		expect(component.showSummaryModal).toBe(true);
	});

	it('should open details modal with course', () => {
		component.openDetailsModal('MatemÃƒÂ¡ticas');
		expect(component.showDetailsModal).toBe(true);
		expect(component.selectedCourse).toBe('MatemÃƒÂ¡ticas');
	});

	it('should open grades modal with course', () => {
		component.openGradesModal('ComunicaciÃƒÂ³n');
		expect(component.showGradesModal).toBe(true);
		expect(component.selectedCourse).toBe('ComunicaciÃƒÂ³n');
	});

	it('should register voice modals on init', () => {
		expect(voiceServiceMock.registerModal).toHaveBeenCalled();
		expect(voiceServiceMock.onCommand).toHaveBeenCalled();
	});
});
// #endregion
