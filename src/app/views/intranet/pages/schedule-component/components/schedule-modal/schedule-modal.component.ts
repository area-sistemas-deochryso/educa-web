import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

export interface CourseSchedule {
	name: string;
	time: string;
}

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

	courseSchedules: CourseSchedule[] = [
		{ name: 'Matemáticas Avanzadas', time: '8:00 a.m. - 9:45 a.m.' },
		{ name: 'Física General', time: '10:00 a.m. - 11:45 a.m.' },
		{ name: 'Química Orgánica', time: '12:00 p.m. - 12:45 p.m.' },
		{ name: 'Historia del Perú', time: '1:00 p.m. - 2:45 p.m.' },
		{ name: 'Literatura Universal', time: '3:00 p.m. - 5:00 p.m.' },
	];

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
