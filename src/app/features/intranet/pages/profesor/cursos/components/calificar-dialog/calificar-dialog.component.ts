import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
	CalificacionConNotasDto,
	CalificarLoteDto,
	CalificarEstudianteDto,
	CalificarGruposLoteDto,
	CalificarGrupoDto,
	OverrideMiembroDto,
	NOTA_MINIMA,
	NOTA_MAXIMA,
	GrupoContenidoDto,
	NotaRow,
	GrupoNotaRow,
} from '@features/intranet/pages/profesor/models';
import { getNotaSeverity as getNotaSeverityFn } from '@intranet-shared/services/calificacion-config';
import type { ConfiguracionCalificacionListDto } from '@data/models';
import {
	buildNotaRows,
	buildGrupoNotaRows,
	calcIndividualStats,
	calcGrupoStats,
} from './calificar-dialog.helpers';

@Component({
	selector: 'app-calificar-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		DialogModule,
		ButtonModule,
		InputNumberModule,
		InputTextModule,
		TableModule,
		TagModule,
		TooltipModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calificar-dialog.component.html',
	styleUrl: './calificar-dialog.component.scss',
})
export class CalificarDialogComponent {
	// #region Inputs
	readonly visible = input(false);
	readonly saving = input(false);
	readonly calificacion = input<CalificacionConNotasDto | null>(null);
	readonly estudiantes = input<{ id: number; nombre: string }[]>([]);
	readonly grupos = input<GrupoContenidoDto[]>([]);
	readonly calificacionConfig = input<ConfiguracionCalificacionListDto | null>(null);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly save = output<CalificarLoteDto>();
	readonly saveGrupos = output<CalificarGruposLoteDto>();
	// #endregion

	// #region Estado local
	readonly notaRows = signal<NotaRow[]>([]);
	readonly grupoNotaRows = signal<GrupoNotaRow[]>([]);
	readonly searchQuery = signal('');
	private readonly _editVersion = signal(0);
	readonly NOTA_MINIMA = NOTA_MINIMA;
	readonly NOTA_MAXIMA = NOTA_MAXIMA;
	// #endregion

	// #region Computed
	readonly isGrupal = computed(() => !!this.calificacion()?.esGrupal);

	readonly dialogTitle = computed(() => {
		const cal = this.calificacion();
		if (!cal) return 'Calificar';
		return cal.esGrupal ? `Calificar (Grupal): ${cal.titulo}` : `Calificar: ${cal.titulo}`;
	});

	readonly filteredRows = computed(() => {
		const query = this.searchQuery().toLowerCase().trim();
		const rows = this.notaRows();
		if (!query) return rows;
		return rows.filter((r) => r.estudianteNombre.toLowerCase().includes(query));
	});

	readonly filteredGrupoRows = computed(() => {
		const query = this.searchQuery().toLowerCase().trim();
		const rows = this.grupoNotaRows();
		if (!query) return rows;
		return rows.filter(
			(r) =>
				r.grupoNombre.toLowerCase().includes(query) ||
				r.miembros.some((m) => m.nombre.toLowerCase().includes(query)),
		);
	});

	readonly stats = computed(() => {
		this._editVersion();
		if (this.isGrupal()) return this.grupoStats();
		return calcIndividualStats(this.notaRows(), this.calificacionConfig());
	});

	private readonly grupoStats = computed(() => {
		this._editVersion();
		return calcGrupoStats(this.grupoNotaRows(), this.calificacionConfig());
	});

	readonly hasChanges = computed(() => {
		this._editVersion();
		if (this.isGrupal()) {
			return this.grupoNotaRows().some((r) => r.nota !== null && r.nota !== undefined);
		}
		return this.notaRows().some((r) => r.nota !== null && r.nota !== undefined);
	});
	// #endregion

	constructor() {
		effect(() => {
			const cal = this.calificacion();
			const estudiantes = this.estudiantes();
			if (!cal || cal.esGrupal || estudiantes.length === 0) return;
			this.notaRows.set(buildNotaRows(cal, estudiantes));
			this.searchQuery.set('');
		});

		effect(() => {
			const cal = this.calificacion();
			const grupos = this.grupos();
			if (!cal || !cal.esGrupal || grupos.length === 0) return;
			this.grupoNotaRows.set(buildGrupoNotaRows(cal, grupos));
			this.searchQuery.set('');
		});
	}

	// #region Handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
		}
	}

	updateNota(estudianteId: number, nota: number | null): void {
		const row = this.notaRows().find((r) => r.estudianteId === estudianteId);
		if (row) {
			if (nota !== null) {
				nota = Math.round(nota * 10) / 10;
				nota = Math.min(Math.max(nota, NOTA_MINIMA), NOTA_MAXIMA);
			}
			row.nota = nota;
			this._editVersion.update((v) => v + 1);
		}
	}

	updateObservacion(estudianteId: number, observacion: string): void {
		const row = this.notaRows().find((r) => r.estudianteId === estudianteId);
		if (row) {
			row.observacion = this.sanitizeObservacion(observacion);
			this._editVersion.update((v) => v + 1);
		}
	}

	updateGrupoNota(grupoId: number, nota: number | null): void {
		const row = this.grupoNotaRows().find((r) => r.grupoId === grupoId);
		if (row) {
			if (nota !== null) {
				nota = Math.round(nota * 10) / 10;
				nota = Math.min(Math.max(nota, NOTA_MINIMA), NOTA_MAXIMA);
			}
			row.nota = nota;
			this._editVersion.update((v) => v + 1);
		}
	}

	updateGrupoObservacion(grupoId: number, observacion: string): void {
		const row = this.grupoNotaRows().find((r) => r.grupoId === grupoId);
		if (row) {
			row.observacion = this.sanitizeObservacion(observacion);
			this._editVersion.update((v) => v + 1);
		}
	}

	onSave(): void {
		if (this.isGrupal()) {
			this.onSaveGrupos();
		} else {
			this.onSaveIndividual();
		}
	}

	toggleMiembroOverride(grupoId: number, estudianteId: number): void {
		const row = this.grupoNotaRows().find((r) => r.grupoId === grupoId);
		if (!row) return;
		const miembro = row.miembros.find((m) => m.estudianteId === estudianteId);
		if (!miembro) return;

		if (miembro.esOverride) {
			miembro.esOverride = false;
			miembro.overrideNota = null;
		} else {
			miembro.esOverride = true;
			miembro.overrideNota = row.nota;
		}
		this._editVersion.update((v) => v + 1);
	}

	updateMiembroOverride(grupoId: number, estudianteId: number, nota: number | null): void {
		const row = this.grupoNotaRows().find((r) => r.grupoId === grupoId);
		if (!row) return;
		const miembro = row.miembros.find((m) => m.estudianteId === estudianteId);
		if (!miembro) return;

		if (nota !== null) {
			nota = Math.round(nota * 10) / 10;
			nota = Math.min(Math.max(nota, NOTA_MINIMA), NOTA_MAXIMA);
		}
		miembro.overrideNota = nota;
		miembro.esOverride = nota !== null;
		this._editVersion.update((v) => v + 1);
	}

	getNotaSeverity(nota: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
		return getNotaSeverityFn(nota, this.calificacionConfig());
	}
	// #endregion

	// #region Helpers privados
	private onSaveIndividual(): void {
		const rows = this.notaRows();
		const notas: CalificarEstudianteDto[] = rows
			.filter((r) => r.nota !== null && r.nota !== undefined && r.esEditable)
			.map((r) => ({
				estudianteId: r.estudianteId,
				nota: r.nota!,
				observacion: r.observacion || null,
			}));

		if (notas.length === 0) return;
		this.save.emit({ notas });
	}

	private onSaveGrupos(): void {
		const rows = this.grupoNotaRows();
		const grupos: CalificarGrupoDto[] = rows
			.filter((r) => r.nota !== null && r.nota !== undefined)
			.map((r) => {
				const overrides: OverrideMiembroDto[] = r.miembros
					.filter((m) => m.esOverride && m.overrideNota !== null)
					.map((m) => ({
						estudianteId: m.estudianteId,
						nota: m.overrideNota!,
						observacion: null,
					}));

				return {
					grupoId: r.grupoId,
					nota: r.nota!,
					observacion: r.observacion || null,
					...(overrides.length > 0 ? { overrides } : {}),
				};
			});

		if (grupos.length === 0) return;
		this.saveGrupos.emit({ grupos });
	}

	private sanitizeObservacion(observacion: string): string {
		return observacion
			.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9\s.,;:\-()]/g, '')
			.slice(0, 100);
	}
	// #endregion
}
