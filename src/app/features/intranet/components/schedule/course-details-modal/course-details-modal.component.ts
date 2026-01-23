import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { AttachmentsModalComponent } from './attachments-modal/attachments-modal.component';
import { TasksModalComponent } from './tasks-modal/tasks-modal.component';
import { SubmissionsModalComponent } from './submissions-modal/submissions-modal.component';
import { COURSE_NAMES } from '../../../pages/schedule-component/courses.config';
import {
	ModalControlsComponent,
	WeekSearchBoxComponent,
	WeekAccordionItemComponent,
	WeekData,
	EvaluationsAccordionComponent,
	Evaluation,
	StudentCardComponent,
	CourseSearchComponent,
	SidebarLinksComponent,
	SidebarLink,
	MemberListComponent,
} from './components';

export interface CourseDetails {
	name: string;
	weeks: WeekData[];
	evaluations: Evaluation[];
	workGroup: string[];
	teacher: string;
}

@Component({
	selector: 'app-course-details-modal',
	imports: [
		CommonModule,
		DialogModule,
		TooltipModule,
		AttachmentsModalComponent,
		TasksModalComponent,
		SubmissionsModalComponent,
		ModalControlsComponent,
		WeekSearchBoxComponent,
		WeekAccordionItemComponent,
		EvaluationsAccordionComponent,
		StudentCardComponent,
		CourseSearchComponent,
		SidebarLinksComponent,
		MemberListComponent,
	],
	templateUrl: './course-details-modal.component.html',
	styleUrl: './course-details-modal.component.scss',
})
export class CourseDetailsModalComponent implements OnChanges {
	@Input() visible = false;
	@Input() courseName: string | null = null;
	@Output() visibleChange = new EventEmitter<boolean>();
	@Output() openSchedule = new EventEmitter<void>();
	@Output() openSummary = new EventEmitter<void>();
	@Output() openGrades = new EventEmitter<string>();

	weekSearchTerm = '';
	courseSearchTerm = '';
	courseSearchResults: string[] = [];
	showCourseDropdown = false;
	evaluationsExpanded = false;

	isExpanded = false;
	isLeftSide = true;

	showAttachmentsModal = false;
	showTasksModal = false;
	showSubmissionsModal = false;
	selectedWeekName = '';

	currentCourseDetails: CourseDetails = this.getDefaultCourseDetails('');

	validCourses = COURSE_NAMES;

	// Links para las secciones del sidebar
	courseSearchLinks: SidebarLink[] = [
		{ label: 'HORARIOS', action: 'schedule' },
		{ label: 'NOTAS / ASISTENCIAS', action: 'summary' },
	];

	courseNameLinks: SidebarLink[] = [
		{ label: 'CALIFICACIONES', action: 'grades' },
		{ label: 'NOTAS / ASISTENCIAS', action: 'summary' },
	];

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['courseName'] && this.courseName) {
			this.currentCourseDetails = this.getDefaultCourseDetails(this.courseName);
			this.courseSearchTerm = this.courseName;
			this.weekSearchTerm = '';
			this.evaluationsExpanded = false;
		}
	}

	getDefaultCourseDetails(courseName: string): CourseDetails {
		return {
			name: courseName,
			weeks: Array.from({ length: 11 }, (_, i) => ({
				id: i + 1,
				name: `SEMANA ${i + 1}`,
				expanded: false,
				teacherMessage:
					'Mensaje del docente: _______________________________________________',
				attachments: { count: 5, unread: 4, reviewed: 1 },
				pendingTasks: { count: 2, unread: 2 },
				submittedTasks: { count: 1, unread: 1, reviewed: 0 },
			})),
			evaluations: [
				{ name: 'Examen Calificado 1', grade: 0 },
				{ name: 'Examen Calificado 2', grade: 0 },
				{ name: 'Examen Calificado 3', grade: 0 },
				{ name: 'Examen Calificado 4', grade: 0 },
				{ name: 'Examen Calificado 5', grade: 0 },
			],
			workGroup: [
				'Tupac Yupanqui María José',
				'García López Pedro',
				'Rodríguez Silva Ana',
				'Mendoza Quispe Carlos',
			],
			teacher: 'Sifuentes García Diana Isabella',
		};
	}

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	toggleExpand(): void {
		this.isExpanded = !this.isExpanded;
	}

	toggleSide(): void {
		this.isLeftSide = !this.isLeftSide;
	}

	get filteredWeeks(): WeekData[] {
		if (!this.weekSearchTerm.trim()) {
			return this.currentCourseDetails.weeks;
		}
		const term = this.weekSearchTerm.toLowerCase();
		return this.currentCourseDetails.weeks.filter(
			(week) => week.name.toLowerCase().includes(term) || `semana ${week.id}`.includes(term),
		);
	}

	toggleWeek(week: WeekData): void {
		week.expanded = !week.expanded;
	}

	toggleEvaluations(): void {
		this.evaluationsExpanded = !this.evaluationsExpanded;
	}

	onCourseSearch(): void {
		if (this.courseSearchTerm.trim()) {
			const term = this.courseSearchTerm.toLowerCase();
			this.courseSearchResults = this.validCourses.filter((course) =>
				course.toLowerCase().includes(term),
			);
			this.showCourseDropdown = this.courseSearchResults.length > 0;
		} else {
			this.courseSearchResults = [];
			this.showCourseDropdown = false;
		}
	}

	selectCourse(course: string): void {
		this.courseSearchTerm = course;
		this.currentCourseDetails = this.getDefaultCourseDetails(course);
		this.showCourseDropdown = false;
		this.weekSearchTerm = '';
		this.evaluationsExpanded = false;
	}

	hideCourseDropdown(): void {
		setTimeout(() => {
			this.showCourseDropdown = false;
		}, 200);
	}

	onLinkClick(action: string): void {
		switch (action) {
			case 'schedule':
				this.onOpenSchedule();
				break;
			case 'summary':
				this.onOpenSummary();
				break;
			case 'grades':
				this.onOpenGrades();
				break;
		}
	}

	onOpenSchedule(): void {
		this.visibleChange.emit(false);
		this.openSchedule.emit();
	}

	onOpenSummary(): void {
		this.visibleChange.emit(false);
		this.openSummary.emit();
	}

	onOpenGrades(): void {
		this.visibleChange.emit(false);
		this.openGrades.emit(this.currentCourseDetails.name);
	}

	openAttachments(week: WeekData): void {
		this.selectedWeekName = week.name;
		this.showAttachmentsModal = true;
	}

	openTasks(week: WeekData): void {
		this.selectedWeekName = week.name;
		this.showTasksModal = true;
	}

	openSubmissions(week: WeekData): void {
		this.selectedWeekName = week.name;
		this.showSubmissionsModal = true;
	}
}
