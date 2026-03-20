import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { PageHeaderComponent } from '@shared/components';
import { VistaPromedio } from '../models';
import { EstudianteNotasFacade } from './services/estudiante-notas.facade';
import { NotasCursoCardComponent } from './components/notas-curso-card/notas-curso-card.component';
import { SimuladorNotasComponent } from './components/simulador-notas/simulador-notas.component';

@Component({
	selector: 'app-estudiante-notas',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		Select,
		SelectButtonModule,
		ButtonModule,
		TagModule,
		ProgressSpinnerModule,
		CardModule,
		PageHeaderComponent,
		NotasCursoCardComponent,
		SimuladorNotasComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-notas.component.html',
	styleUrl: './estudiante-notas.component.scss',
})
export class EstudianteNotasComponent implements OnInit {
	private readonly facade = inject(EstudianteNotasFacade);
	readonly vm = this.facade.vm;

	readonly vistaOptions = [
		{ label: 'Semana', value: 'semana' },
		{ label: 'Periodo', value: 'periodo' },
		{ label: 'Año', value: 'anual' },
	];

	ngOnInit(): void {
		this.facade.loadNotas();
	}

	// #region Event handlers
	onRetry(): void {
		this.facade.loadNotas();
	}

	onCursoChange(index: number): void {
		this.facade.selectCurso(index);
	}

	onVistaChange(vista: VistaPromedio): void {
		this.facade.setVista(vista);
	}

	onOpenSimulador(): void {
		this.facade.openSimulador();
	}

	onCloseSimulador(): void {
		this.facade.closeSimulador();
	}

	onSimulacionChange(event: { calificacionId: number; nota: number | null }): void {
		this.facade.updateSimulacion(event.calificacionId, event.nota);
	}

	onResetSimulacion(): void {
		this.facade.resetSimulacion();
	}
	// #endregion
}
