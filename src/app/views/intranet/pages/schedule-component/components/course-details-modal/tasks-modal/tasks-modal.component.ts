import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { logger } from '@app/helpers';

export interface Task {
	id: number;
	title: string;
	description: string;
	dueDate: string;
	status: 'pending' | 'late' | 'submitted';
	isRead: boolean;
}

@Component({
	selector: 'app-tasks-modal',
	imports: [CommonModule, DialogModule],
	templateUrl: './tasks-modal.component.html',
	styleUrl: './tasks-modal.component.scss',
})
export class TasksModalComponent {
	@Input() visible = false;
	@Input() weekName = '';
	@Output() visibleChange = new EventEmitter<boolean>();

	tasks: Task[] = [
		{
			id: 1,
			title: 'Ejercicios del capítulo 3',
			description: 'Resolver los ejercicios 1 al 15 del libro de texto',
			dueDate: '25/01/2026',
			status: 'pending',
			isRead: false,
		},
		{
			id: 2,
			title: 'Ensayo sobre el tema principal',
			description: 'Redactar un ensayo de 500 palabras mínimo',
			dueDate: '28/01/2026',
			status: 'pending',
			isRead: false,
		},
	];

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	getStatusClass(status: string): string {
		return `status-${status}`;
	}

	getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			pending: 'Pendiente',
			late: 'Atrasado',
			submitted: 'Enviado',
		};
		return labels[status] || status;
	}

	getDaysRemaining(dueDate: string): string {
		const [day, month, year] = dueDate.split('/').map(Number);
		const due = new Date(year, month - 1, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const diffTime = due.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) return 'Vencido';
		if (diffDays === 0) return 'Hoy';
		if (diffDays === 1) return 'Mañana';
		return `${diffDays} días`;
	}

	markAsRead(task: Task): void {
		task.isRead = true;
	}

	openTask(task: Task): void {
		this.markAsRead(task);
		logger.log('Abriendo tarea:', task.title);
	}
}
