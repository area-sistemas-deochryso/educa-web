import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';

import {
	ConfiguracionCalificacionListDto,
	CrearConfiguracionCalificacionDto,
	ActualizarConfiguracionCalificacionDto,
	CrearConfiguracionLiteralDto,
	NivelEducativo,
	TipoCalificacion,
} from '../../models';

interface LiteralRow {
	letra: string;
	descripcion: string;
	notaMinima: number | null;
	notaMaxima: number | null;
	orden: number;
	esAprobatoria: boolean;
}

@Component({
	selector: 'app-config-calificacion-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		SelectModule,
		InputNumberModule,
		InputTextModule,
		CheckboxModule,
		DividerModule,
	],
	templateUrl: './config-calificacion-dialog.component.html',
	styleUrl: './config-calificacion-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigCalificacionDialogComponent {
	// #region Inputs / Outputs
	readonly visible = input(false);
	readonly config = input<ConfiguracionCalificacionListDto | null>(null);
	readonly nivel = input.required<NivelEducativo>();
	readonly anio = input.required<number>();
	readonly loading = input(false);

	readonly visibleChange = output<boolean>();
	readonly crear = output<CrearConfiguracionCalificacionDto>();
	readonly actualizar = output<{ id: number; dto: ActualizarConfiguracionCalificacionDto }>();
	// #endregion

	// #region Estado local
	readonly tipoCalificacion = signal<TipoCalificacion>('LITERAL');
	readonly notaMinAprobatoria = signal<number | null>(11);
	readonly literales = signal<LiteralRow[]>(this.defaultLiterales());
	// #endregion

	// #region Computed
	readonly isEditing = computed(() => this.config() !== null);

	readonly tipoOptions = [
		{ label: 'Literal (AD, A, B, C)', value: 'LITERAL' },
		{ label: 'Numérico (0-20)', value: 'NUMERICO' },
	];

	readonly isFormValid = computed(() => {
		const tipo = this.tipoCalificacion();
		if (tipo === 'NUMERICO') {
			return this.notaMinAprobatoria() !== null && this.notaMinAprobatoria()! > 0;
		}
		return this.literales().length > 0 && this.literales().every((l) => l.letra.trim() && l.descripcion.trim());
	});
	// #endregion

	// #region Lifecycle
	ngOnChanges(): void {
		const cfg = this.config();
		if (cfg) {
			this.tipoCalificacion.set(cfg.tipoCalificacion);
			this.notaMinAprobatoria.set(cfg.notaMinAprobatoria);
			this.literales.set(
				cfg.literales.map((l) => ({
					letra: l.letra,
					descripcion: l.descripcion,
					notaMinima: l.notaMinima,
					notaMaxima: l.notaMaxima,
					orden: l.orden,
					esAprobatoria: l.esAprobatoria,
				})),
			);
		} else {
			this.tipoCalificacion.set(this.nivel() === 'Secundaria' ? 'NUMERICO' : 'LITERAL');
			this.notaMinAprobatoria.set(11);
			this.literales.set(this.defaultLiterales());
		}
	}
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onSave(): void {
		const lits: CrearConfiguracionLiteralDto[] = this.literales().map((l) => ({
			letra: l.letra,
			descripcion: l.descripcion,
			notaMinima: l.notaMinima,
			notaMaxima: l.notaMaxima,
			orden: l.orden,
			esAprobatoria: l.esAprobatoria,
		}));

		if (this.isEditing()) {
			const dto: ActualizarConfiguracionCalificacionDto = {
				tipoCalificacion: this.tipoCalificacion(),
				notaMinAprobatoria: this.tipoCalificacion() === 'NUMERICO' ? this.notaMinAprobatoria() : null,
				literales: this.tipoCalificacion() === 'LITERAL' ? lits : [],
			};
			this.actualizar.emit({ id: this.config()!.id, dto });
		} else {
			const dto: CrearConfiguracionCalificacionDto = {
				nivel: this.nivel(),
				tipoCalificacion: this.tipoCalificacion(),
				notaMinAprobatoria: this.tipoCalificacion() === 'NUMERICO' ? this.notaMinAprobatoria() : null,
				anio: this.anio(),
				literales: this.tipoCalificacion() === 'LITERAL' ? lits : [],
			};
			this.crear.emit(dto);
		}
	}

	addLiteral(): void {
		const current = this.literales();
		this.literales.set([
			...current,
			{
				letra: '',
				descripcion: '',
				notaMinima: null,
				notaMaxima: null,
				orden: current.length + 1,
				esAprobatoria: false,
			},
		]);
	}

	removeLiteral(index: number): void {
		this.literales.update((list) => list.filter((_, i) => i !== index));
	}

	updateLiteral(index: number, field: keyof LiteralRow, value: unknown): void {
		this.literales.update((list) =>
			list.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
		);
	}
	// #endregion

	// #region Helpers
	private defaultLiterales(): LiteralRow[] {
		return [
			{ letra: 'AD', descripcion: 'Logro Destacado', notaMinima: null, notaMaxima: null, orden: 1, esAprobatoria: true },
			{ letra: 'A', descripcion: 'Logro Esperado', notaMinima: null, notaMaxima: null, orden: 2, esAprobatoria: true },
			{ letra: 'B', descripcion: 'En Proceso', notaMinima: null, notaMaxima: null, orden: 3, esAprobatoria: false },
			{ letra: 'C', descripcion: 'En Inicio', notaMinima: null, notaMaxima: null, orden: 4, esAprobatoria: false },
		];
	}
	// #endregion
}
