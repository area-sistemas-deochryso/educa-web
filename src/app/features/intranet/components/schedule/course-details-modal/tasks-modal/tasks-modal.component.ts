// #region Imports
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { logger } from '@core/helpers';

// #endregion
// #region Implementation
/**
 * Task item shown in the tasks modal.
 */
export interface Task {
	/** Task id. */
	id: number;
	/** Title shown in the list. */
	title: string;
	/** Detailed description. */
	description: string;
	/** Due date in DD/MM/YYYY format. */
	dueDate: string;
	/** Current task status. */
	status: 'pending' | 'late' | 'submitted';
	/** True when the task has been opened. */
	isRead: boolean;
}

@Component({
	selector: 'app-tasks-modal',
	imports: [CommonModule, DialogModule],
	templateUrl: './tasks-modal.component.html',
	styleUrl: './tasks-modal.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Tasks modal for a selected week.
 */
export class TasksModalComponent {
	// #region Inputs/Outputs
	/** Whether the modal is visible. */
	@Input() visible = false;
	/** Week label shown in the header. */
	@Input() weekName = '';
	/** Two way binding for visibility. */
	@Output() visibleChange = new EventEmitter<boolean>();
	// #endregion

	// #region Placeholder data
	/** Static sample tasks (replace with API when available). */
	tasks: Task[] = [
		{
			id: 1,
			title: 'Ejercicios del capitulo 3',
			description: 'Resolver los ejercicios 1 al 15 del libro de texto',
			dueDate: '25/01/2026',
			status: 'pending',
			isRead: false,
		},
		{
			id: 2,
			title: 'Ensayo sobre el tema principal',
			description: 'Redactar un ensayo de 500 palabras minimo',
			dueDate: '28/01/2026',
			status: 'pending',
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
	 * @param status Task status.
	 * @returns CSS class name.
	 */
	getStatusClass(status: string): string {
		return `status-${status}`;
	}

	/**
	 * Resolve a display label for a status key.
	 *
	 * @param status Task status.
	 * @returns Label for UI.
	 */
	getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			pending: 'Pendiente',
			late: 'Atrasado',
			submitted: 'Enviado',
		};
		return labels[status] || status;
	}

	/**
	 * Get a human friendly remaining time label.
	 *
	 * @param dueDate Due date in DD/MM/YYYY.
	 * @returns Label for remaining time.
	 */
	getDaysRemaining(dueDate: string): string {
		const [day, month, year] = dueDate.split('/').map(Number);
		const due = new Date(year, month - 1, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const diffTime = due.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) return 'Vencido';
		if (diffDays === 0) return 'Hoy';
		if (diffDays === 1) return 'Manana';
		return `${diffDays} dias`;
	}

	/**
	 * Mark a task as read in local state.
	 *
	 * @param task Task to update.
	 */
	markAsRead(task: Task): void {
		task.isRead = true;
	}

	/**
	 * Mark a task as read and open it.
	 *
	 * @param task Task to open.
	 */
	openTask(task: Task): void {
		this.markAsRead(task);
		logger.log('Opening task:', task.title);
	}
}
// #endregion
