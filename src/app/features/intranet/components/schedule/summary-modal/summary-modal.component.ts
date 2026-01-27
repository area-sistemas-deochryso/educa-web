import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
	CourseSummary,
	getCourseSummaries,
} from '@features/intranet/pages/schedule-component/courses.config';

@Component({
	selector: 'app-summary-modal',
	imports: [CommonModule, DialogModule, MenuModule],
	templateUrl: './summary-modal.component.html',
	styleUrl: './summary-modal.component.scss',
})
export class SummaryModalComponent {
	@ViewChild('courseMenu') courseMenu!: Menu;
	@Input() visible = false;
	@Output() visibleChange = new EventEmitter<boolean>();
	@Output() openDetails = new EventEmitter<string>();
	@Output() openGrades = new EventEmitter<string>();

	selectedCourse: string | null = null;

	courseSummaries: CourseSummary[] = getCourseSummaries();

	courseMenuItems: MenuItem[] = [
		{ label: 'Ver Detalles', command: () => this.onOpenDetails() },
		{ label: 'Ver Calificaciones', command: () => this.onOpenGrades() },
	];

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	onCourseClick(event: Event, courseName: string): void {
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

	getTotalAttendance(): number {
		return this.courseSummaries.reduce((sum, course) => sum + course.attendance, 0);
	}

	getTotalGrade(): number {
		return this.courseSummaries.reduce((sum, course) => sum + course.grade, 0);
	}

	getCourseCount(): number {
		return this.courseSummaries.length;
	}

	getGradeClass(grade: number): string {
		if (grade === 0) return 'grade-red';
		if (grade < 11) return 'grade-red';
		return 'grade-green';
	}

	getAttendanceClass(attendance: number): string {
		if (attendance === 0) return 'attendance-red';
		return 'attendance-green';
	}
}
