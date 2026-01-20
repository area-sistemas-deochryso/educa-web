import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';

export interface Submission {
	id: number;
	taskTitle: string;
	submittedDate: string;
	status: 'pending_review' | 'reviewed' | 'returned';
	grade: number | null;
	feedback: string | null;
	isRead: boolean;
}

@Component({
	selector: 'app-submissions-modal',
	imports: [CommonModule, DialogModule],
	templateUrl: './submissions-modal.component.html',
	styleUrl: './submissions-modal.component.scss',
})
export class SubmissionsModalComponent {
	@Input() visible = false;
	@Input() weekName = '';
	@Output() visibleChange = new EventEmitter<boolean>();

	submissions: Submission[] = [
		{
			id: 1,
			taskTitle: 'Ejercicios del capítulo 2',
			submittedDate: '10/01/2026',
			status: 'pending_review',
			grade: null,
			feedback: null,
			isRead: false,
		},
	];

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	getStatusClass(status: string): string {
		return `status-${status.replace('_', '-')}`;
	}

	getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			pending_review: 'En revisión',
			reviewed: 'Calificado',
			returned: 'Devuelto',
		};
		return labels[status] || status;
	}

	getStatusIcon(status: string): string {
		const icons: Record<string, string> = {
			pending_review: 'pi-clock',
			reviewed: 'pi-check-circle',
			returned: 'pi-replay',
		};
		return icons[status] || 'pi-file';
	}

	markAsRead(submission: Submission): void {
		submission.isRead = true;
	}

	viewSubmission(submission: Submission): void {
		this.markAsRead(submission);
		console.log('Viendo entrega:', submission.taskTitle);
	}

	getGradeClass(grade: number | null): string {
		if (grade === null) return '';
		if (grade < 11) return 'grade-red';
		return 'grade-green';
	}
}
