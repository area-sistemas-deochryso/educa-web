// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
	CourseSchedule,
	getCourseSchedules,
} from '@features/intranet/pages/schedule-component/courses.config';

// #endregion
// #region Implementation
@Component({
	selector: 'app-schedule-modal',
	imports: [CommonModule, DialogModule, MenuModule],
	templateUrl: './schedule-modal.component.html',
	styleUrl: './schedule-modal.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleModalComponent {
	@ViewChild('courseMenu') courseMenu!: Menu;
	// * Inputs/outputs for dialog state and actions.
	@Input() visible = false;
	@Output() visibleChange = new EventEmitter<boolean>();
	@Output() openDetails = new EventEmitter<string>();
	@Output() openGrades = new EventEmitter<string>();

	// * Currently selected course for context menu.
	selectedCourse: string | null = null;

	// * Static schedule data.
	courseSchedules: CourseSchedule[] = getCourseSchedules();

	courseMenuItems: MenuItem[] = [
		{ label: 'Ver Detalles', command: () => this.onOpenDetails() },
		{ label: 'Ver Calificaciones', command: () => this.onOpenGrades() },
	];

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	onCourseClick(event: Event, courseName: string): void {
		// * Open menu anchored to the clicked course.
		this.selectedCourse = courseName;
		this.courseMenu.toggle(event);
	}

	private onOpenDetails(): void {
		if (this.selectedCourse) {
			this.openDetails.emit(this.selectedCourse);
		}
	}

	private onOpenGrades(): void {
		if (this.selectedCourse) {
			this.openGrades.emit(this.selectedCourse);
		}
	}
}
// #endregion
