// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { getGradeClass as getGradeClassFn } from '@intranet-shared/services/calificacion-config';

// #endregion
// #region Implementation
/**
 * Evaluation item shown in the grades modal.
 */
export interface Evaluation {
	/** Evaluation name. */
	name: string;
	/** Base grade value. */
	grade: number;
	/** True when the grade can be edited in simulation mode. */
	editable?: boolean;
	/** Temporary grade value used for simulation. */
	tempGrade?: number;
}

/**
 * Grades summary for a course.
 */
export interface CourseGrades {
	/** Course name. */
	name: string;
	/** List of evaluations for the course. */
	evaluations: Evaluation[];
}

@Component({
	selector: 'app-grades-modal',
	imports: [CommonModule, FormsModule, DialogModule],
	templateUrl: './grades-modal.component.html',
	styleUrl: './grades-modal.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Grades modal with optional simulation mode.
 */
export class GradesModalComponent implements OnChanges {
	// #region Inputs/Outputs
	/** Whether the modal is visible. */
	@Input() visible = false;
	/** Selected course name or null. */
	@Input() courseName: string | null = null;
	/** Two way binding for visibility. */
	@Output() visibleChange = new EventEmitter<boolean>();
	// #endregion

	// #region State
	/** Simulation mode enables temporary grade edits. */
	simulationMode = false;

	currentCourseGrades: CourseGrades = this.getDefaultCourseGrades('');
	// #endregion

	/**
	 * Reset grades when course changes.
	 *
	 * @param changes Angular change map.
	 */
	ngOnChanges(changes: SimpleChanges): void {
		if (changes['courseName'] && this.courseName) {
			this.currentCourseGrades = this.getDefaultCourseGrades(this.courseName);
			this.simulationMode = false;
		}
	}

	/**
	 * Build default static grades for the modal.
	 * This is placeholder data until the API is wired.
	 *
	 * @param courseName Course name to show in the header.
	 * @returns Default course grades.
	 */
	getDefaultCourseGrades(courseName: string): CourseGrades {
		return {
			name: courseName,
			evaluations: [
				{ name: 'Examen Calificado 1', grade: 0 },
				{ name: 'Examen Calificado 2', grade: 0 },
				{ name: 'Examen Calificado 3', grade: 0 },
				{ name: 'Examen Calificado 4', grade: 0 },
				{ name: 'Examen Calificado 5', grade: 0 },
			],
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

	/**
	 * Toggle simulation mode and prepare temporary grades.
	 */
	toggleSimulation(): void {
		this.simulationMode = !this.simulationMode;
		if (this.simulationMode) {
			this.currentCourseGrades.evaluations.forEach((eval_) => {
				eval_.tempGrade = eval_.grade;
				eval_.editable = true;
			});
		} else {
			this.resetTempGrades();
		}
	}

	/**
	 * Clear temporary grades and editing flags.
	 */
	resetTempGrades(): void {
		this.currentCourseGrades.evaluations.forEach((eval_) => {
			eval_.tempGrade = undefined;
			eval_.editable = false;
		});
	}

	/**
	 * Resolve the grade shown in the UI for an evaluation.
	 *
	 * @param evaluation Evaluation item.
	 * @returns Display grade value.
	 */
	getDisplayGrade(evaluation: Evaluation): number {
		return this.simulationMode && evaluation.tempGrade !== undefined
			? evaluation.tempGrade
			: evaluation.grade;
	}

	/**
	 * Update temporary grade if the value is within range.
	 *
	 * @param evaluation Evaluation to update.
	 * @param value Input value as string.
	 */
	updateTempGrade(evaluation: Evaluation, value: string): void {
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
			evaluation.tempGrade = numValue;
		}
	}

	/**
	 * Average grade for display, using temp grades when in simulation mode.
	 */
	get currentAverage(): number {
		const grades = this.currentCourseGrades.evaluations.map((e) =>
			this.simulationMode && e.tempGrade !== undefined ? e.tempGrade : e.grade,
		);
		const sum = grades.reduce((a, b) => a + b, 0);
		return Math.round((sum / grades.length) * 10) / 10;
	}

	/**
	 * Resolve a grade class based on the numeric value.
	 *
	 * @param grade Grade value.
	 */
	getGradeClass(grade: number): string {
		return getGradeClassFn(grade) || 'grade-red';
	}
}
// #endregion
