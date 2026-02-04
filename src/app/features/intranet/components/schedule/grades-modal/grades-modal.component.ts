import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

export interface Evaluation {
	name: string;
	grade: number;
	editable?: boolean;
	tempGrade?: number;
}

export interface CourseGrades {
	name: string;
	evaluations: Evaluation[];
}

@Component({
	selector: 'app-grades-modal',
	imports: [CommonModule, FormsModule, DialogModule],
	templateUrl: './grades-modal.component.html',
	styleUrl: './grades-modal.component.scss',
})
export class GradesModalComponent implements OnChanges {
	// * Inputs/outputs for dialog state and selected course.
	@Input() visible = false;
	@Input() courseName: string | null = null;
	@Output() visibleChange = new EventEmitter<boolean>();

	// * Simulation mode enables temporary grade edits.
	simulationMode = false;

	currentCourseGrades: CourseGrades = this.getDefaultCourseGrades('');

	ngOnChanges(changes: SimpleChanges): void {
		// * Reset grades when course changes.
		if (changes['courseName'] && this.courseName) {
			this.currentCourseGrades = this.getDefaultCourseGrades(this.courseName);
			this.simulationMode = false;
		}
	}

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

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	toggleSimulation(): void {
		// * Enable temp grades to calculate "what-if" average.
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

	resetTempGrades(): void {
		this.currentCourseGrades.evaluations.forEach((eval_) => {
			eval_.tempGrade = undefined;
			eval_.editable = false;
		});
	}

	getDisplayGrade(evaluation: Evaluation): number {
		return this.simulationMode && evaluation.tempGrade !== undefined
			? evaluation.tempGrade
			: evaluation.grade;
	}

	updateTempGrade(evaluation: Evaluation, value: string): void {
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue) && numValue >= 0 && numValue <= 20) {
			evaluation.tempGrade = numValue;
		}
	}

	get currentAverage(): number {
		const grades = this.currentCourseGrades.evaluations.map((e) =>
			this.simulationMode && e.tempGrade !== undefined ? e.tempGrade : e.grade,
		);
		const sum = grades.reduce((a, b) => a + b, 0);
		return Math.round((sum / grades.length) * 10) / 10;
	}

	getGradeClass(grade: number): string {
		if (grade === 0) return 'grade-red';
		if (grade < 11) return 'grade-red';
		return 'grade-green';
	}
}
