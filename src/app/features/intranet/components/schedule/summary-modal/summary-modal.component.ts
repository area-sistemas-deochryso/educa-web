// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
	CourseSummary,
	getCourseSummaries,
} from '@features/intranet/pages/cross-role/schedule-component/courses.config';
import { getGradeClass as getGradeClassFn } from '@intranet-shared/services/calificacion-config';

// #endregion
// #region Implementation
@Component({
	selector: 'app-summary-modal',
	imports: [CommonModule, DialogModule, MenuModule],
	templateUrl: './summary-modal.component.html',
	styleUrl: './summary-modal.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Summary modal listing course attendance and grades.
 */
export class SummaryModalComponent {
	/** Context menu reference for a selected course. */
	@ViewChild('courseMenu') courseMenu!: Menu;
	// #region Inputs/Outputs
	/** Whether the modal is visible. */
	@Input() visible = false;
	/** Two way binding for visibility. */
	@Output() visibleChange = new EventEmitter<boolean>();
	/** Emits when user opens details for a course. */
	@Output() openDetails = new EventEmitter<string>();
	/** Emits when user opens grades for a course. */
	@Output() openGrades = new EventEmitter<string>();
	// #endregion

	/** Currently selected course for the context menu. */
	selectedCourse: string | null = null;

	/** Static summary data (replace with API when available). */
	courseSummaries: CourseSummary[] = getCourseSummaries();

	/** Context menu items for the selected course. */
	courseMenuItems: MenuItem[] = [
		{ label: 'Ver Detalles', command: () => this.onOpenDetails() },
		{ label: 'Ver Calificaciones', command: () => this.onOpenGrades() },
	];

	/**
	 * Sync visibility and emit the two way binding event.
	 *
	 * @param value New visibility state.
	 */
	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	/**
	 * Open the menu anchored to the clicked course row.
	 *
	 * @param event Click event.
	 * @param courseName Course name for the menu actions.
	 */
	onCourseClick(event: Event, courseName: string): void {
		this.selectedCourse = courseName;
		this.courseMenu.toggle(event);
	}

	/**
	 * Emit details action for the selected course.
	 */
	private onOpenDetails(): void {
		if (this.selectedCourse) {
			this.openDetails.emit(this.selectedCourse);
		}
	}

	/**
	 * Emit grades action for the selected course.
	 */
	private onOpenGrades(): void {
		if (this.selectedCourse) {
			this.openGrades.emit(this.selectedCourse);
		}
	}

	/**
	 * Sum attendance across all courses.
	 */
	getTotalAttendance(): number {
		return this.courseSummaries.reduce((sum, course) => sum + course.attendance, 0);
	}

	/**
	 * Sum grades across all courses.
	 */
	getTotalGrade(): number {
		return this.courseSummaries.reduce((sum, course) => sum + course.grade, 0);
	}

	/**
	 * Count total courses.
	 */
	getCourseCount(): number {
		return this.courseSummaries.length;
	}

	/**
	 * Resolve a grade class based on the numeric value.
	 *
	 * @param grade Grade value.
	 */
	getGradeClass(grade: number): string {
		return getGradeClassFn(grade) || 'grade-red';
	}

	/**
	 * Resolve an attendance class based on the numeric value.
	 *
	 * @param attendance Attendance value.
	 */
	getAttendanceClass(attendance: number): string {
		if (attendance === 0) return 'attendance-red';
		return 'attendance-green';
	}
}
// #endregion
