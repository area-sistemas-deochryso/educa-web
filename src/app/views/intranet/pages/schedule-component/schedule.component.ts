import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleCalendarComponent } from './components/schedule-calendar/schedule-calendar.component';
import { ScheduleModalComponent } from './components/schedule-modal/schedule-modal.component';
import { SummaryModalComponent } from './components/summary-modal/summary-modal.component';
import { CourseDetailsModalComponent } from './components/course-details-modal/course-details-modal.component';
import { GradesModalComponent } from './components/grades-modal/grades-modal.component';

interface ScheduleModalState {
	schedule?: boolean;
	summary?: boolean;
	details?: { visible: boolean; course: string };
	grades?: { visible: boolean; course: string };
}

const STORAGE_KEY = 'schedule_modals_state';

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
export class ScheduleComponent implements OnInit {
	showScheduleModal = false;
	showSummaryModal = false;
	showDetailsModal = false;
	showGradesModal = false;

	selectedCourse: string | null = null;

	ngOnInit(): void {
		this.restoreModalsState();
	}

	private getModalsState(): ScheduleModalState {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	}

	private saveModalState(modal: keyof ScheduleModalState, value: boolean | { visible: boolean; course: string }): void {
		const state = this.getModalsState();
		if (value === false || (typeof value === 'object' && !value.visible)) {
			delete state[modal];
		} else {
			state[modal] = value as any;
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}

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
