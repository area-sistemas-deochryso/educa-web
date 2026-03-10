import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { EstudianteAsistencia, AttendanceStatus } from '@shared/services/asistencia';

@Component({
	selector: 'app-salon-asistencia-tab',
	standalone: true,
	imports: [CommonModule, FormsModule, TableModule, SelectModule, TagModule],
	templateUrl: './salon-asistencia-tab.component.html',
	styleUrl: './salon-asistencia-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonAsistenciaTabComponent {
	// #region Inputs / Outputs
	readonly asistenciaData = input<EstudianteAsistencia[]>([]);
	readonly loading = input(false);
	readonly grado = input<string>('');
	readonly seccion = input<string>('');

	readonly mesChange = output<{ mes: number; anio: number }>();
	// #endregion

	// #region Estado local
	readonly selectedMes = signal(new Date().getMonth() + 1);
	readonly selectedAnio = signal(new Date().getFullYear());

	readonly mesesOptions = [
		{ label: 'Enero', value: 1 },
		{ label: 'Febrero', value: 2 },
		{ label: 'Marzo', value: 3 },
		{ label: 'Abril', value: 4 },
		{ label: 'Mayo', value: 5 },
		{ label: 'Junio', value: 6 },
		{ label: 'Julio', value: 7 },
		{ label: 'Agosto', value: 8 },
		{ label: 'Septiembre', value: 9 },
		{ label: 'Octubre', value: 10 },
		{ label: 'Noviembre', value: 11 },
		{ label: 'Diciembre', value: 12 },
	];
	// #endregion

	// #region Computed
	readonly diasDelMes = computed(() => {
		const mes = this.selectedMes();
		const anio = this.selectedAnio();
		return new Date(anio, mes, 0).getDate();
	});

	readonly diasArray = computed(() => Array.from({ length: this.diasDelMes() }, (_, i) => i + 1));

	readonly stats = computed(() => {
		const data = this.asistenciaData();
		let presentes = 0;
		let tardanzas = 0;
		let faltas = 0;
		let total = 0;

		for (const est of data) {
			for (const a of est.asistencias) {
				total++;
				if (a.estadoIngreso === 'T' || a.estadoIngreso === 'A') presentes++;
				else if (a.estadoIngreso === 'F') tardanzas++;
				else if (a.estadoIngreso === 'N') faltas++;
			}
		}

		return { total: data.length, presentes, tardanzas, faltas };
	});
	// #endregion

	// #region Event handlers
	onMesChange(mes: number): void {
		this.selectedMes.set(mes);
		this.mesChange.emit({ mes, anio: this.selectedAnio() });
	}
	// #endregion

	// #region Helpers
	getEstadoDia(estudiante: EstudianteAsistencia, dia: number): AttendanceStatus | null {
		const fecha = `${this.selectedAnio()}-${String(this.selectedMes()).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
		const asistencia = estudiante.asistencias.find((a) => a.fecha.startsWith(fecha));
		return asistencia?.estadoIngreso ?? null;
	}

	getEstadoClass(estado: AttendanceStatus | null): string {
		switch (estado) {
			case 'T':
			case 'A':
				return 'estado-presente';
			case 'F':
				return 'estado-tardanza';
			case 'N':
				return 'estado-falta';
			case 'J':
				return 'estado-justificado';
			default:
				return 'estado-vacio';
		}
	}

	getEstadoLabel(estado: AttendanceStatus | null): string {
		switch (estado) {
			case 'T':
				return 'T';
			case 'A':
				return 'A';
			case 'F':
				return 'F';
			case 'N':
				return 'N';
			case 'J':
				return 'J';
			case '-':
				return '-';
			default:
				return '';
		}
	}
	// #endregion
}
