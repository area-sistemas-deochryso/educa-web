import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekContentRowComponent } from '../week-content-row/week-content-row.component';

export interface WeekData {
	id: number;
	name: string;
	expanded: boolean;
	teacherMessage: string;
	attachments: { count: number; unread: number; reviewed: number };
	pendingTasks: { count: number; unread: number };
	submittedTasks: { count: number; unread: number; reviewed: number };
}

@Component({
	selector: 'app-week-accordion-item',
	standalone: true,
	imports: [CommonModule, WeekContentRowComponent],
	template: `
		<div class="week-item" [class.expanded]="week.expanded">
			<div class="week-header" (click)="toggle.emit()">
				<span>{{ week.name }}</span>
				<i
					class="pi"
					[class.pi-chevron-down]="!week.expanded"
					[class.pi-chevron-up]="week.expanded"
				></i>
			</div>
			@if (week.expanded) {
				<div class="week-content">
					<p class="teacher-message">{{ week.teacherMessage }}</p>
					<app-week-content-row
						icon="pi-paperclip"
						[title]="week.attachments.count + ' Archivos Adjuntos'"
						[subtitle]="
							week.attachments.unread +
							' sin leer · ' +
							week.attachments.reviewed +
							' revisado'
						"
						actionLabel="Ver archivos"
						(action)="openAttachments.emit()"
					/>
					<app-week-content-row
						icon="pi-file-edit"
						[title]="week.pendingTasks.count + ' Tareas Pendientes'"
						[subtitle]="week.pendingTasks.unread + ' sin leer'"
						actionLabel="Ver Tareas"
						(action)="openTasks.emit()"
					/>
					<app-week-content-row
						icon="pi-check-circle"
						[title]="week.submittedTasks.count + ' Tarea Enviada'"
						[subtitle]="
							week.submittedTasks.unread +
							' sin leer · ' +
							week.submittedTasks.reviewed +
							' revisadas'
						"
						actionLabel="Ver Entregas"
						(action)="openSubmissions.emit()"
					/>
				</div>
			}
		</div>
	`,
	styles: `
		.week-item {
			border-bottom: 1px solid #ddd;

			&:last-child {
				border-bottom: none;
			}

			&.expanded .week-header {
				background-color: rgba(0, 0, 0, 0.03);
			}
		}

		.week-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 0.5rem 1rem;
			font-size: 0.8rem;
			color: var(--intranet-default-text-color);
			cursor: pointer;

			&:hover {
				background-color: rgba(0, 0, 0, 0.02);
			}

			i {
				font-size: 0.7rem;
				color: var(--intranet-soft-text-color);
			}
		}

		.week-content {
			padding: 1rem;
			background-color: rgba(0, 0, 0, 0.01);
			border-top: 1px solid #eee;

			.teacher-message {
				font-size: 0.75rem;
				color: var(--intranet-soft-text-color);
				margin: 0 0 1rem 0;
				font-style: italic;
			}
		}
	`,
})
export class WeekAccordionItemComponent {
	@Input({ required: true }) week!: WeekData;
	@Output() toggle = new EventEmitter<void>();
	@Output() openAttachments = new EventEmitter<void>();
	@Output() openTasks = new EventEmitter<void>();
	@Output() openSubmissions = new EventEmitter<void>();
}
