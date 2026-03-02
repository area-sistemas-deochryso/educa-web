// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
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
	changeDetection: ChangeDetectionStrategy.OnPush,
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
/**
 * Schedule page with calendar and modal shortcuts.
 */
export class ScheduleComponent implements OnInit, OnDestroy {
	// #region Dependencies
	private voiceService = inject(VoiceRecognitionService);
	private route = inject(ActivatedRoute);
	private storage = inject(StorageService);
	private destroyRef = inject(DestroyRef);
	private voiceUnsubscribers: (() => void)[] = [];
	// #endregion

	// #region Modal state
	/** True when the schedule modal is open. */
	showScheduleModal = false;
	/** True when the summary modal is open. */
	showSummaryModal = false;
	/** True when the course details modal is open. */
	showDetailsModal = false;
	/** True when the grades modal is open. */
	showGradesModal = false;

	/** Selected course for details and grades modals. */
	selectedCourse: string | null = null;
	// #endregion

	/**
	 * Restore modal state and register listeners.
	 */
	ngOnInit(): void {
		this.restoreModalsState();
		this.registerVoiceModals();
		this.handleQueryParams();
	}

	/**
	 * Handle modal deep links from URL query params.
	 */
	private handleQueryParams(): void {
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

	/**
	 * Clean up voice listeners to avoid leaks.
	 */
	ngOnDestroy(): void {
		this.voiceUnsubscribers.forEach((unsub) => unsub());
	}

	/**
	 * Register voice commands for each modal.
	 */
	private registerVoiceModals(): void {
		this.voiceUnsubscribers.push(
			this.voiceService.registerModal({
				name: 'horario',
				aliases: ['horarios', 'mi horario', 'el horario', 'schedule'],
				open: () => this.openScheduleModal(),
				close: () => this.onScheduleModalClose(),
			}),
		);

		// Summary modal
		this.voiceUnsubscribers.push(
			this.voiceService.registerModal({
				name: 'resumen',
				aliases: ['resumen academico', 'el resumen', 'summary', 'resumen de cursos'],
				open: () => this.openSummaryModal(),
				close: () => this.onSummaryModalClose(),
			}),
		);

		// Grades modal (requires selectedCourse)
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

		// Details modal (requires selectedCourse)
		this.voiceUnsubscribers.push(
			this.voiceService.registerModal({
				name: 'detalles',
				aliases: ['detalles del curso', 'detalle', 'informacion del curso'],
				open: () => {
					if (this.selectedCourse) {
						this.openDetailsModal(this.selectedCourse);
					}
				},
				close: () => this.onDetailsModalClose(),
			}),
		);

		// Global "close modal" command.
		this.voiceUnsubscribers.push(
			this.voiceService.onCommand((command) => {
				if (command === 'close-modal') {
					this.closeActiveModal();
				}
			}),
		);
	}

	/**
	 * Close the active modal using a priority order.
	 */
	private closeActiveModal(): void {
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

	/**
	 * Read modal state from storage.
	 */
	private getModalsState(): ScheduleModalsState {
		return this.storage.getScheduleModalsState();
	}

	/**
	 * Persist a modal state change in storage.
	 *
	 * @param modal Modal key to update.
	 * @param value New state value.
	 */
	private saveModalState(
		modal: keyof ScheduleModalsState,
		value: boolean | { visible: boolean; course: string },
	): void {
		this.storage.updateScheduleModalState(modal, value);
	}

	/**
	 * Restore modals state from storage.
	 */
	private restoreModalsState(): void {
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

	/** Open schedule modal and persist state. */
	openScheduleModal(): void {
		this.showScheduleModal = true;
		this.saveModalState('schedule', true);
	}

	/** Close schedule modal and persist state. */
	onScheduleModalClose(): void {
		this.showScheduleModal = false;
		this.saveModalState('schedule', false);
	}

	/** Open summary modal and persist state. */
	openSummaryModal(): void {
		this.showSummaryModal = true;
		this.saveModalState('summary', true);
	}

	/** Close summary modal and persist state. */
	onSummaryModalClose(): void {
		this.showSummaryModal = false;
		this.saveModalState('summary', false);
	}

	/**
	 * Open details modal and close other modals.
	 *
	 * @param courseName Selected course name.
	 */
	openDetailsModal(courseName: string): void {
		this.selectedCourse = courseName;
		this.showScheduleModal = false;
		this.showSummaryModal = false;
		this.showDetailsModal = true;
		this.saveModalState('schedule', false);
		this.saveModalState('summary', false);
		this.saveModalState('details', { visible: true, course: courseName });
	}

	/** Close details modal and persist state. */
	onDetailsModalClose(): void {
		this.showDetailsModal = false;
		this.saveModalState('details', { visible: false, course: '' });
	}

	/**
	 * Open grades modal and close other modals.
	 *
	 * @param courseName Selected course name.
	 */
	openGradesModal(courseName: string): void {
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

	/** Close grades modal and persist state. */
	onGradesModalClose(): void {
		this.showGradesModal = false;
		this.saveModalState('grades', { visible: false, course: '' });
	}
}
// #endregion
