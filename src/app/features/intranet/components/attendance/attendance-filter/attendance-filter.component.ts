import { Component, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

export interface GradoOption {
	label: string;
	value: string;
}

export interface SeccionOption {
	label: string;
	value: string;
}

const GRADOS: GradoOption[] = [
	{ label: '1RO', value: '1RO' },
	{ label: '2DO', value: '2DO' },
	{ label: '3RO', value: '3RO' },
	{ label: '4TO', value: '4TO' },
	{ label: '5TO', value: '5TO' },
];

const SECCIONES: SeccionOption[] = [
	{ label: 'A', value: 'A' },
	{ label: 'B', value: 'B' },
	{ label: 'C', value: 'C' },
	{ label: 'D', value: 'D' },
];

@Component({
	selector: 'app-attendance-filter',
	standalone: true,
	imports: [CommonModule, FormsModule, Select],
	templateUrl: './attendance-filter.component.html',
	styleUrl: './attendance-filter.component.scss',
})
export class AttendanceFilterComponent implements OnInit {
	grado = input<string>('');
	seccion = input<string>('');

	filterChange = output<{ grado: string; seccion: string }>();

	gradoOptions = GRADOS;
	seccionOptions = SECCIONES;

	selectedGrado: string = '';
	selectedSeccion: string = '';

	ngOnInit(): void {
		this.selectedGrado = this.grado();
		this.selectedSeccion = this.seccion();
	}

	onGradoChange(grado: string): void {
		this.selectedGrado = grado;
		this.emitFilter();
	}

	onSeccionChange(seccion: string): void {
		this.selectedSeccion = seccion;
		this.emitFilter();
	}

	private emitFilter(): void {
		this.filterChange.emit({
			grado: this.selectedGrado,
			seccion: this.selectedSeccion,
		});
	}
}
