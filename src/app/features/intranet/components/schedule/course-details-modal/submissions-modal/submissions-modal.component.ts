// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { logger } from '@core/helpers';
import { getGradeClass as getGradeClassFn } from '@shared/services/calificacion-config';

// #endregion
// #region Implementation
/**
 * Submission item shown in the submissions modal.
 */
export interface Submission {
	/** Submission id. */
	id: number;
	/** Title of the related task. */
	taskTitle: string;
	/** Submission date in DD/MM/YYYY format. */
	submittedDate: string;
	/** Review status key. */
	status: 'pending_review' | 'reviewed' | 'returned';
	/** Grade value or null when not graded. */
	grade: number | null;
	/** Feedback text or null when not provided. */
	feedback: string | null;
	/** True when the submission has been opened. */
	isRead: boolean;
}

@Component({
	selector: 'app-submissions-modal',
	imports: [CommonModule, DialogModule],
	templateUrl: './submissions-modal.component.html',
	styleUrl: './submissions-modal.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Submissions modal for a selected week.
 */
export class SubmissionsModalComponent {
	// #region Inputs/Outputs
	/** Whether the modal is visible. */
	@Input() visible = false;
	/** Week label shown in the header. */
	@Input() weekName = '';
	/** Two way binding for visibility. */
	@Output() visibleChange = new EventEmitter<boolean>();
	// #endregion

	// #region Placeholder data
	/** Static sample submissions (replace with API when available). */
	submissions: Submission[] = [
		{
			id: 1,
			taskTitle: 'Ejercicios del capitulo 2',
			submittedDate: '10/01/2026',
			status: 'pending_review',
			grade: null,
			feedback: null,
			isRead: false,
		},
	];
	// #endregion

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
	 * Resolve the status class name for the UI.
	 *
	 * @param status Review status.
	 * @returns CSS class name.
	 */
	getStatusClass(status: string): string {
		return `status-${status.replace('_', '-')}`;
	}

	/**
	 * Resolve a display label for a status key.
	 *
	 * @param status Review status.
	 * @returns Label for UI.
	 */
	getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			pending_review: 'En revision',
			reviewed: 'Calificado',
			returned: 'Devuelto',
		};
		return labels[status] || status;
	}

	/**
	 * Resolve the PrimeIcons class for a status key.
	 *
	 * @param status Review status.
	 * @returns Icon class name.
	 */
	getStatusIcon(status: string): string {
		const icons: Record<string, string> = {
			pending_review: 'pi-clock',
			reviewed: 'pi-check-circle',
			returned: 'pi-replay',
		};
		return icons[status] || 'pi-file';
	}

	/**
	 * Mark a submission as read in local state.
	 *
	 * @param submission Submission to update.
	 */
	markAsRead(submission: Submission): void {
		submission.isRead = true;
	}

	/**
	 * Mark a submission as read and open it.
	 *
	 * @param submission Submission to open.
	 */
	viewSubmission(submission: Submission): void {
		this.markAsRead(submission);
		logger.log('Opening submission:', submission.taskTitle);
	}

	/**
	 * Resolve a grade class based on the numeric value.
	 *
	 * @param grade Grade value or null.
	 * @returns CSS class name.
	 */
	getGradeClass(grade: number | null): string {
		if (grade === null) return '';
		return getGradeClassFn(grade) || 'grade-red';
	}
}
// #endregion
