// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { AttachmentsModalComponent } from './attachments-modal/attachments-modal.component';
import { TasksModalComponent } from './tasks-modal/tasks-modal.component';
import { SubmissionsModalComponent } from './submissions-modal/submissions-modal.component';
import { COURSE_NAMES } from '@features/intranet/pages/shared/schedule-component/courses.config';
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

// #endregion
// #region Implementation
/**
 * Aggregated course data for the modal UI.
 */
export interface CourseDetails {
	/** Display name of the course. */
	name: string;
	/** Week rows shown in the accordion. */
	weeks: WeekData[];
	/** Evaluation summary list. */
	evaluations: Evaluation[];
	/** Group member names for the sidebar. */
	workGroup: string[];
	/** Teacher display name. */
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
	changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Course details modal with weeks, evaluations, and quick actions.
 *
 * @example
 * <app-course-details-modal
 *   [(visible)]="isOpen"
 *   [courseName]="selectedCourse"
 *   (openSchedule)="goToSchedule()"
 *   (openSummary)="goToSummary()"
 *   (openGrades)="goToGrades($event)">
 * </app-course-details-modal>
 */
export class CourseDetailsModalComponent implements OnChanges {
	// #region Inputs/Outputs
	/** Whether the modal is visible. */
	@Input() visible = false;
	/** Selected course name or null. */
	@Input() courseName: string | null = null;
	/** Two way binding for visibility. */
	@Output() visibleChange = new EventEmitter<boolean>();
	/** Navigate to the schedule view. */
	@Output() openSchedule = new EventEmitter<void>();
	/** Navigate to the summary view. */
	@Output() openSummary = new EventEmitter<void>();
	/** Navigate to the grades view, passing the course name. */
	@Output() openGrades = new EventEmitter<string>();
	// #endregion

	// #region UI state
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
	// #endregion

	// #region Sidebar links
	courseSearchLinks: SidebarLink[] = [
		{ label: 'HORARIOS', action: 'schedule' },
		{ label: 'NOTAS / ASISTENCIAS', action: 'summary' },
	];

	courseNameLinks: SidebarLink[] = [
		{ label: 'CALIFICACIONES', action: 'grades' },
		{ label: 'NOTAS / ASISTENCIAS', action: 'summary' },
	];
	// #endregion

	/**
	 * Reset local state when the selected course changes.
	 *
	 * @param changes Angular change map.
	 */
	ngOnChanges(changes: SimpleChanges): void {
		if (changes['courseName'] && this.courseName) {
			this.currentCourseDetails = this.getDefaultCourseDetails(this.courseName);
			this.courseSearchTerm = this.courseName;
			this.weekSearchTerm = '';
			this.evaluationsExpanded = false;
		}
	}

	/**
	 * Build default static data for the modal.
	 * This is placeholder data until the API is wired.
	 *
	 * @param courseName Course name to show in the header.
	 * @returns Default course details.
	 */
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
				'Tupac Yupanqui Maria Jose',
				'Garcia Lopez Pedro',
				'Rodriguez Silva Ana',
				'Mendoza Quispe Carlos',
			],
			teacher: 'Sifuentes Garcia Diana Isabella',
		};
	}

	/**
	 * Sync visibility and emit the two way binding event.
	 *
	 * @param value New visibility state.
	 */
	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	/** Toggle modal size. */
	toggleExpand(): void {
		this.isExpanded = !this.isExpanded;
	}

	/** Toggle modal side docking. */
	toggleSide(): void {
		this.isLeftSide = !this.isLeftSide;
	}

	/**
	 * Filtered weeks based on the search term.
	 */
	get filteredWeeks(): WeekData[] {
		if (!this.weekSearchTerm.trim()) {
			return this.currentCourseDetails.weeks;
		}
		const term = this.weekSearchTerm.toLowerCase();
		return this.currentCourseDetails.weeks.filter(
			(week) => week.name.toLowerCase().includes(term) || `semana ${week.id}`.includes(term),
		);
	}

	/**
	 * Toggle the expanded state for a week.
	 *
	 * @param week Week row to toggle.
	 */
	toggleWeek(week: WeekData): void {
		week.expanded = !week.expanded;
	}

	/** Toggle the evaluations accordion. */
	toggleEvaluations(): void {
		this.evaluationsExpanded = !this.evaluationsExpanded;
	}

	/**
	 * Search the course list and update the dropdown.
	 */
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

	/**
	 * Select a course and reset local state.
	 *
	 * @param course Selected course name.
	 */
	selectCourse(course: string): void {
		this.courseSearchTerm = course;
		this.currentCourseDetails = this.getDefaultCourseDetails(course);
		this.showCourseDropdown = false;
		this.weekSearchTerm = '';
		this.evaluationsExpanded = false;
	}

	/**
	 * Hide the dropdown after a short delay to allow click selection.
	 */
	hideCourseDropdown(): void {
		setTimeout(() => {
			this.showCourseDropdown = false;
		}, 200);
	}

	/**
	 * Handle sidebar link actions.
	 *
	 * @param action Action id.
	 */
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

	/** Emit navigation to the schedule view. */
	onOpenSchedule(): void {
		this.visibleChange.emit(false);
		this.openSchedule.emit();
	}

	/** Emit navigation to the summary view. */
	onOpenSummary(): void {
		this.visibleChange.emit(false);
		this.openSummary.emit();
	}

	/** Emit navigation to the grades view. */
	onOpenGrades(): void {
		this.visibleChange.emit(false);
		this.openGrades.emit(this.currentCourseDetails.name);
	}

	/**
	 * Open the attachments modal for a week.
	 *
	 * @param week Week row.
	 */
	openAttachments(week: WeekData): void {
		this.selectedWeekName = week.name;
		this.showAttachmentsModal = true;
	}

	/**
	 * Open the tasks modal for a week.
	 *
	 * @param week Week row.
	 */
	openTasks(week: WeekData): void {
		this.selectedWeekName = week.name;
		this.showTasksModal = true;
	}

	/**
	 * Open the submissions modal for a week.
	 *
	 * @param week Week row.
	 */
	openSubmissions(week: WeekData): void {
		this.selectedWeekName = week.name;
		this.showSubmissionsModal = true;
	}
}
// #endregion
