import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import {
	CalificacionDto,
	CrearCalificacionDto,
	CursoContenidoSemanaDto,
	TIPOS_EVALUACION,
	TipoEvaluacion,
	PESO_MINIMO,
	PESO_MAXIMO,
} from '../../../models';

interface FormData {
	titulo: string;
	tipo: TipoEvaluacion;
	peso: number;
	fechaEvaluacion: Date | null;
	semanaId: number | null;
	tareaId: number | null;
	esGrupal: boolean;
}

@Component({
	selector: 'app-evaluacion-form-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		InputTextModule,
		InputNumberModule,
		Select,
		DatePickerModule,
		TooltipModule,
		ToggleSwitchModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './evaluacion-form-dialog.component.html',
	styleUrl: './evaluacion-form-dialog.component.scss',
})
export class EvaluacionFormDialogComponent {
	// #region Inputs
	readonly visible = input(false);
	readonly saving = input(false);
	readonly editing = input<CalificacionDto | null>(null);
	readonly semanas = input<CursoContenidoSemanaDto[]>([]);
	readonly contenidoId = input<number | null>(null);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly save = output<CrearCalificacionDto>();
	// #endregion

	// #region Estado local
	readonly formData = signal<FormData>({
		titulo: '',
		tipo: 'Examen',
		peso: 0.2,
		fechaEvaluacion: null,
		semanaId: null,
		tareaId: null,
		esGrupal: false,
	});

	readonly tiposOptions = TIPOS_EVALUACION.map((t) => ({ label: t, value: t }));
	readonly PESO_MINIMO = PESO_MINIMO;
	readonly PESO_MAXIMO = PESO_MAXIMO;
	// #endregion

	// #region Computed
	readonly semanaOptions = computed(() =>
		this.semanas().map((s) => ({
			label: `Semana ${s.numeroSemana}${s.titulo ? ' - ' + s.titulo : ''}`,
			value: s.id,
		})),
	);

	readonly isEditing = computed(() => !!this.editing());

	readonly dialogTitle = computed(() =>
		this.isEditing() ? 'Editar Evaluación' : 'Nueva Evaluación',
	);

	readonly isFormValid = computed(() => {
		const data = this.formData();
		return (
			data.titulo.trim().length > 0 &&
			data.tipo &&
			data.peso >= PESO_MINIMO &&
			data.peso <= PESO_MAXIMO &&
			data.fechaEvaluacion !== null &&
			data.semanaId !== null
		);
	});
	// #endregion

	constructor() {
		// Populate form when editing
		effect(() => {
			const edit = this.editing();
			if (edit) {
				this.formData.set({
					titulo: edit.titulo,
					tipo: edit.tipo,
					peso: edit.peso,
					fechaEvaluacion: new Date(edit.fechaEvaluacion),
					semanaId: edit.semanaId,
					tareaId: edit.tareaId,
					esGrupal: edit.esGrupal,
				});
			} else {
				this.formData.set({
					titulo: '',
					tipo: 'Examen',
					peso: 0.2,
					fechaEvaluacion: null,
					semanaId: null,
					tareaId: null,
					esGrupal: false,
				});
			}
		});
	}

	// #region Handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
		}
	}

	updateField<K extends keyof FormData>(field: K, value: FormData[K]): void {
		this.formData.update((f) => ({ ...f, [field]: value }));
	}

	onSave(): void {
		const data = this.formData();
		if (!this.isFormValid() || !this.contenidoId()) return;

		const dto: CrearCalificacionDto = {
			cursoContenidoId: this.contenidoId()!,
			tareaId: data.tareaId,
			semanaId: data.semanaId!,
			titulo: data.titulo.trim(),
			peso: data.peso,
			fechaEvaluacion: data.fechaEvaluacion!.toISOString(),
			tipo: data.tipo,
			esGrupal: data.esGrupal,
		};

		this.save.emit(dto);
	}
	// #endregion
}
