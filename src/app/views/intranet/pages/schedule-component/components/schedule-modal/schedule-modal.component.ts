import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { CourseSchedule, getCourseSchedules } from '../../courses.config';

@Component({
	selector: 'app-schedule-modal',
	imports: [CommonModule, DialogModule, MenuModule],
	templateUrl: './schedule-modal.component.html',
	styleUrl: './schedule-modal.component.scss',
})
export class ScheduleModalComponent {
	@ViewChild('courseMenu') courseMenu!: Menu;
	@Input() visible = false;
	@Output() visibleChange = new EventEmitter<boolean>();
	@Output() openDetails = new EventEmitter<string>();
	@Output() openGrades = new EventEmitter<string>();

	selectedCourse: string | null = null;

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
