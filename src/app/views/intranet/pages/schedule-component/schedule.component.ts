import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

interface CalendarDay {
	day: number | null;
	isCurrentMonth: boolean;
	isToday: boolean;
}

interface CourseSchedule {
	name: string;
	time: string;
}

interface CourseSummary {
	name: string;
	attendance: number;
	grade: number;
}

interface WeekContent {
	id: number;
	name: string;
	expanded: boolean;
	teacherMessage: string;
	attachments: { count: number; unread: number; reviewed: number };
	pendingTasks: { count: number; unread: number };
	submittedTasks: { count: number; unread: number; reviewed: number };
}

interface Evaluation {
	name: string;
	grade: number;
	editable?: boolean;
	tempGrade?: number;
}

interface CourseDetails {
	name: string;
	weeks: WeekContent[];
	evaluations: Evaluation[];
	workGroup: string[];
	teacher: string;
}

@Component({
	selector: 'app-schedule',
	imports: [CommonModule, FormsModule, DialogModule, MenuModule],
	templateUrl: './schedule.component.html',
	styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit {
	@ViewChild('dayMenu') dayMenu!: Menu;
	@ViewChild('courseMenu') courseMenu!: Menu;

	currentDate = new Date();
	currentMonth: number;
	currentYear: number;
	calendarDays: CalendarDay[] = [];
	selectedDay: number | null = null;
	selectedCourse: string | null = null;

	dayHeaders = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb', 'Dom'];

	monthNames = [
		'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
		'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
	];

	// Modales
	showScheduleModal = false;
	showSummaryModal = false;
	showDetailsModal = false;
	showGradesModal = false;

	// Búsqueda y filtros
	weekSearchTerm = '';
	courseSearchTerm = '';
	courseSearchResults: string[] = [];
	showCourseDropdown = false;

	// Estado de expansión
	evaluationsExpanded = false;

	// Modo simulación
	simulationMode = false;

	// Menú contextual para días
	menuItems: MenuItem[] = [
		{ label: 'Ver Horarios', command: () => this.openScheduleModal() },
		{ label: 'Ver Notas / Asistencias', command: () => this.openSummaryModal() },
	];

	// Menú contextual para cursos
	courseMenuItems: MenuItem[] = [
		{ label: 'Ver Detalles', command: () => this.openDetailsModal() },
		{ label: 'Ver Calificaciones', command: () => this.openGradesModal() },
	];

	// Lista de cursos válidos
	validCourses = [
		'Matemáticas Avanzadas',
		'Física General',
		'Química Orgánica',
		'Historia del Perú',
		'Literatura Universal',
	];

	// Datos de ejemplo
	courseSchedules: CourseSchedule[] = [
		{ name: 'Matemáticas Avanzadas', time: '8:00 a.m. - 9:45 a.m.' },
		{ name: 'Física General', time: '10:00 a.m. - 11:45 a.m.' },
		{ name: 'Química Orgánica', time: '12:00 p.m. - 12:45 p.m.' },
		{ name: 'Historia del Perú', time: '1:00 p.m. - 2:45 p.m.' },
		{ name: 'Literatura Universal', time: '3:00 p.m. - 5:00 p.m.' },
	];

	courseSummaries: CourseSummary[] = [
		{ name: 'Matemáticas Avanzadas', attendance: 0, grade: 0 },
		{ name: 'Física General', attendance: 20, grade: 20 },
		{ name: 'Química Orgánica', attendance: 0, grade: 4 },
		{ name: 'Historia del Perú', attendance: 20, grade: 20 },
		{ name: 'Literatura Universal', attendance: 0, grade: 16 },
	];

	// Datos del curso actual en detalle
	currentCourseDetails: CourseDetails = this.getDefaultCourseDetails('Matemáticas Avanzadas');

	constructor() {
		this.currentMonth = this.currentDate.getMonth();
		this.currentYear = this.currentDate.getFullYear();
	}

	ngOnInit(): void {
		this.generateCalendar();
	}

	getDefaultCourseDetails(courseName: string): CourseDetails {
		return {
			name: courseName,
			weeks: Array.from({ length: 11 }, (_, i) => ({
				id: i + 1,
				name: `SEMANA ${i + 1}`,
				expanded: false,
				teacherMessage: 'Mensaje del docente: _______________________________________________',
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
			workGroup: ['Tupac Yupanqui María José', 'García López Pedro', 'Rodríguez Silva Ana', 'Mendoza Quispe Carlos'],
			teacher: 'Sifuentes García Diana Isabella',
		};
	}

	generateCalendar(): void {
		this.calendarDays = [];
		const firstDay = new Date(this.currentYear, this.currentMonth, 1);
		const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

		let startDayOfWeek = firstDay.getDay() - 1;
		if (startDayOfWeek < 0) startDayOfWeek = 6;

		const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			this.calendarDays.push({ day: prevMonthLastDay - i, isCurrentMonth: false, isToday: false });
		}

		const today = new Date();
		for (let day = 1; day <= lastDay.getDate(); day++) {
			const isToday = day === today.getDate() && this.currentMonth === today.getMonth() && this.currentYear === today.getFullYear();
			this.calendarDays.push({ day, isCurrentMonth: true, isToday });
		}

		const remainingDays = 42 - this.calendarDays.length;
		for (let day = 1; day <= remainingDays; day++) {
			this.calendarDays.push({ day, isCurrentMonth: false, isToday: false });
		}
	}

	previousMonth(): void {
		this.currentMonth--;
		if (this.currentMonth < 0) {
			this.currentMonth = 11;
			this.currentYear--;
		}
		this.generateCalendar();
	}

	nextMonth(): void {
		this.currentMonth++;
		if (this.currentMonth > 11) {
			this.currentMonth = 0;
			this.currentYear++;
		}
		this.generateCalendar();
	}

	get monthYearDisplay(): string {
		return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
	}

	onDayClick(event: Event, calDay: CalendarDay): void {
		this.selectedDay = calDay.day;
		this.dayMenu.toggle(event);
	}

	openScheduleModal(): void {
		this.showScheduleModal = true;
	}

	openSummaryModal(): void {
		this.showSummaryModal = true;
	}

	onCourseClick(event: Event, courseName: string): void {
		this.selectedCourse = courseName;
		this.courseMenu.toggle(event);
	}

	openDetailsModal(): void {
		if (this.selectedCourse) {
			this.currentCourseDetails = this.getDefaultCourseDetails(this.selectedCourse);
			this.courseSearchTerm = this.selectedCourse;
		}
		this.weekSearchTerm = '';
		this.evaluationsExpanded = false;
		this.showDetailsModal = true;
	}

	openGradesModal(): void {
		if (this.selectedCourse) {
			this.currentCourseDetails = this.getDefaultCourseDetails(this.selectedCourse);
		}
		this.simulationMode = false;
		this.resetTempGrades();
		this.showGradesModal = true;
	}

	// Navegación entre modales
	openScheduleFromDetails(): void {
		this.showDetailsModal = false;
		this.showScheduleModal = true;
	}

	openSummaryFromDetails(): void {
		this.showDetailsModal = false;
		this.showSummaryModal = true;
	}

	openGradesFromDetails(): void {
		this.showDetailsModal = false;
		this.openGradesModal();
	}

	// Filtro de semanas
	get filteredWeeks(): WeekContent[] {
		if (!this.weekSearchTerm.trim()) {
			return this.currentCourseDetails.weeks;
		}
		const term = this.weekSearchTerm.toLowerCase();
		return this.currentCourseDetails.weeks.filter(week =>
			week.name.toLowerCase().includes(term) ||
			`semana ${week.id}`.includes(term)
		);
	}

	toggleWeek(week: WeekContent): void {
		week.expanded = !week.expanded;
	}

	toggleEvaluations(): void {
		this.evaluationsExpanded = !this.evaluationsExpanded;
	}

	// Búsqueda de cursos
	onCourseSearch(): void {
		if (this.courseSearchTerm.trim()) {
			const term = this.courseSearchTerm.toLowerCase();
			this.courseSearchResults = this.validCourses.filter(course =>
				course.toLowerCase().includes(term)
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

	// Simulación de promedio
	toggleSimulation(): void {
		this.simulationMode = !this.simulationMode;
		if (this.simulationMode) {
			this.currentCourseDetails.evaluations.forEach(eval_ => {
				eval_.tempGrade = eval_.grade;
				eval_.editable = true;
			});
		} else {
			this.resetTempGrades();
		}
	}

	resetTempGrades(): void {
		this.currentCourseDetails.evaluations.forEach(eval_ => {
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
		const grades = this.currentCourseDetails.evaluations.map(e =>
			this.simulationMode && e.tempGrade !== undefined ? e.tempGrade : e.grade
		);
		const sum = grades.reduce((a, b) => a + b, 0);
		return Math.round((sum / grades.length) * 10) / 10;
	}

	// Utilidades
	getTotalAttendance(): number {
		return this.courseSummaries.reduce((sum, course) => sum + course.attendance, 0);
	}

	getTotalGrade(): number {
		return this.courseSummaries.reduce((sum, course) => sum + course.grade, 0);
	}

	getCourseCount(): number {
		return this.courseSummaries.length;
	}

	getGradeClass(grade: number): string {
		if (grade === 0) return 'grade-red';
		if (grade < 11) return 'grade-red';
		return 'grade-green';
	}

	getAttendanceClass(attendance: number): string {
		if (attendance === 0) return 'attendance-red';
		return 'attendance-green';
	}
}
