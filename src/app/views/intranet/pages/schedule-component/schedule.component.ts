import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleCalendarComponent } from './components/schedule-calendar/schedule-calendar.component';
import { ScheduleModalComponent } from './components/schedule-modal/schedule-modal.component';
import { SummaryModalComponent } from './components/summary-modal/summary-modal.component';
import { CourseDetailsModalComponent } from './components/course-details-modal/course-details-modal.component';
import { GradesModalComponent } from './components/grades-modal/grades-modal.component';

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
export class ScheduleComponent {
	showScheduleModal = false;
	showSummaryModal = false;
	showDetailsModal = false;
	showGradesModal = false;

	selectedCourse: string | null = null;

	openScheduleModal(): void {
		this.showScheduleModal = true;
	}

	openSummaryModal(): void {
		this.showSummaryModal = true;
	}

	openDetailsModal(courseName: string): void {
		this.selectedCourse = courseName;
		this.showScheduleModal = false;
		this.showSummaryModal = false;
		this.showDetailsModal = true;
	}

	openGradesModal(courseName: string): void {
		this.selectedCourse = courseName;
		this.showScheduleModal = false;
		this.showSummaryModal = false;
		this.showDetailsModal = false;
		this.showGradesModal = true;
	}
}
