// #region Imports
import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScheduleCalendarComponent } from '@features/intranet/components/schedule/schedule-calendar/schedule-calendar.component';
import { ScheduleModalComponent } from '@features/intranet/components/schedule/schedule-modal/schedule-modal.component';
import { SummaryModalComponent } from '@features/intranet/components/schedule/summary-modal/summary-modal.component';
import { CourseDetailsModalComponent } from '@features/intranet/components/schedule/course-details-modal/course-details-modal.component';
import { GradesModalComponent } from '@features/intranet/components/schedule/grades-modal/grades-modal.component';
import { VoiceRecognitionService, StorageService } from '@core/services';
import { ScheduleModalsState } from '@core/services/storage';

// #endregion
// #region Implementation
@Component({
	selector: 'app-schedule',
	imports: [
		CommonModule,
		ScheduleCalendarComponent,
		ScheduleModalComponent,
		SummaryModalComponent,
		CourseDetailsModalComponent,
		GradesModalComponent,
	],
	templateUrl: './schedule.component.html',
	styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit, OnDestroy {
	private voiceService = inject(VoiceRecognitionService);
	private route = inject(ActivatedRoute);
	private storage = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	private voiceUnsubscribers: (() => void)[] = [];

	// * Modal visibility flags (kept in sync with storage).
	showScheduleModal = false;
	showSummaryModal = false;
	showDetailsModal = false;
	showGradesModal = false;

	// * Course context for details/grades modals.
	selectedCourse: string | null = null;

	ngOnInit(): void {
		// * Restore persisted modal state and wire voice/query listeners.
		this.restoreModalsState();
		this.registerVoiceModals();
		this.handleQueryParams();
	}

	private handleQueryParams(): void {
		// * URL query params can deep-link to a specific modal.
		this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			const modal = params['modal'];
			if (modal) {
				switch (modal) {
					case 'schedule':
						this.openScheduleModal();
						break;
					case 'summary':
						this.openSummaryModal();
						break;
					case 'grades':
						this.openGradesModal(params['course'] || '');
						break;
					case 'details':
						this.openDetailsModal(params['course'] || '');
						break;
				}
			}
		});
	}

	ngOnDestroy(): void {
		// * Clean up voice listeners to avoid leaks.
		this.voiceUnsubscribers.forEach((unsub) => unsub());
	}

	private registerVoiceModals(): void {
		// * Register voice shortcuts for each modal.
		this.voiceUnsubscribers.push(
			this.voiceService.registerModal({
				name: 'horario',
				aliases: ['horarios', 'mi horario', 'el horario', 'schedule'],
				open: () => this.openScheduleModal(),
				close: () => this.onScheduleModalClose(),
			}),
		);

		// * Summary modal
		this.voiceUnsubscribers.push(
			this.voiceService.registerModal({
				name: 'resumen',
				aliases: ['resumen académico', 'el resumen', 'summary', 'resumen de cursos'],
				open: () => this.openSummaryModal(),
				close: () => this.onSummaryModalClose(),
			}),
		);

		// * Grades modal (requires selectedCourse)
		this.voiceUnsubscribers.push(
			this.voiceService.registerModal({
				name: 'notas',
				aliases: ['calificaciones', 'mis notas', 'las notas', 'grades'],
				open: () => {
					if (this.selectedCourse) {
						this.openGradesModal(this.selectedCourse);
					}
				},
				close: () => this.onGradesModalClose(),
			}),
		);

		// * Details modal (requires selectedCourse)
		this.voiceUnsubscribers.push(
			this.voiceService.registerModal({
				name: 'detalles',
				aliases: ['detalles del curso', 'detalle', 'información del curso'],
				open: () => {
					if (this.selectedCourse) {
						this.openDetailsModal(this.selectedCourse);
					}
				},
				close: () => this.onDetailsModalClose(),
			}),
		);

		// * Global "close modal" command.
		this.voiceUnsubscribers.push(
			this.voiceService.onCommand((command) => {
				if (command === 'close-modal') {
					this.closeActiveModal();
				}
			}),
		);
	}

	private closeActiveModal(): void {
		// * Close the active modal (priority order).
		if (this.showGradesModal) {
			this.onGradesModalClose();
		} else if (this.showDetailsModal) {
			this.onDetailsModalClose();
		} else if (this.showSummaryModal) {
			this.onSummaryModalClose();
		} else if (this.showScheduleModal) {
			this.onScheduleModalClose();
		}
	}

	private getModalsState(): ScheduleModalsState {
		return this.storage.getScheduleModalsState();
	}

	private saveModalState(
		modal: keyof ScheduleModalsState,
		value: boolean | { visible: boolean; course: string },
	): void {
		this.storage.updateScheduleModalState(modal, value);
	}

	private restoreModalsState(): void {
		// * Restore from storage to keep modal state between visits.
		const state = this.getModalsState();

		if (state.schedule) {
			this.showScheduleModal = true;
		}
		if (state.summary) {
			this.showSummaryModal = true;
		}
		if (state.details?.visible) {
			this.selectedCourse = state.details.course;
			this.showDetailsModal = true;
		}
		if (state.grades?.visible) {
			this.selectedCourse = state.grades.course;
			this.showGradesModal = true;
		}
	}

	openScheduleModal(): void {
		this.showScheduleModal = true;
		this.saveModalState('schedule', true);
	}

	onScheduleModalClose(): void {
		this.showScheduleModal = false;
		this.saveModalState('schedule', false);
	}

	openSummaryModal(): void {
		this.showSummaryModal = true;
		this.saveModalState('summary', true);
	}

	onSummaryModalClose(): void {
		this.showSummaryModal = false;
		this.saveModalState('summary', false);
	}

	openDetailsModal(courseName: string): void {
		// * Switching to details closes other modals and persists state.
		this.selectedCourse = courseName;
		this.showScheduleModal = false;
		this.showSummaryModal = false;
		this.showDetailsModal = true;
		this.saveModalState('schedule', false);
		this.saveModalState('summary', false);
		this.saveModalState('details', { visible: true, course: courseName });
	}

	onDetailsModalClose(): void {
		this.showDetailsModal = false;
		this.saveModalState('details', { visible: false, course: '' });
	}

	openGradesModal(courseName: string): void {
		// * Switching to grades closes other modals and persists state.
		this.selectedCourse = courseName;
		this.showScheduleModal = false;
		this.showSummaryModal = false;
		this.showDetailsModal = false;
		this.showGradesModal = true;
		this.saveModalState('schedule', false);
		this.saveModalState('summary', false);
		this.saveModalState('details', { visible: false, course: '' });
		this.saveModalState('grades', { visible: true, course: courseName });
	}

	onGradesModalClose(): void {
		this.showGradesModal = false;
		this.saveModalState('grades', { visible: false, course: '' });
	}
}
// #endregion
