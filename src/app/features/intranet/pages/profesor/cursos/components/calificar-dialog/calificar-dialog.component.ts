import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
	CalificacionConNotasDto,
	CalificarLoteDto,
	CalificarEstudianteDto,
	CalificarGruposLoteDto,
	GrupoContenidoDto,
	NotaRow,
	GrupoNotaRow,
} from '@features/intranet/pages/profesor/models';
import type { ConfiguracionCalificacionListDto } from '@data/models';
import { tipoEvaluacionLabel } from '@data/models';
import {
	buildNotaRows,
	buildGrupoNotaRows,
	buildGruposPayload,
	calcIndividualStats,
	calcGrupoStats,
	notasFueraDeGrupo,
} from './calificar-dialog.helpers';
import { CalificarIndividualTableComponent } from './components/calificar-individual-table/calificar-individual-table.component';
import { CalificarGrupoListComponent } from './components/calificar-grupo-list/calificar-grupo-list.component';
import { EduButton, EduDialog, EduInputText, EduTag } from '@edu-ui';

@Component({
	selector: 'app-calificar-dialog',
	standalone: true,
	imports: [
		DatePipe,
		FormsModule,
		EduDialog,
		EduButton,
		EduInputText,
		EduTag,
		CalificarIndividualTableComponent,
		CalificarGrupoListComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calificar-dialog.component.html',
	styleUrl: './calificar-dialog.component.scss',
})
export class CalificarDialogComponent {
	readonly tipoLabel = tipoEvaluacionLabel;

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
	// Las filas se mutan en los hijos; este contador invalida stats y hasChanges.
	private readonly _editVersion = signal(0);
	// #endregion

	// #region Computed
	readonly isGrupal = computed(() => !!this.calificacion()?.esGrupal);

	readonly isLiteral = computed(() => {
		const config = this.calificacionConfig();
		return config?.tipoCalificacion === 'LITERAL' && config.literales.length > 0;
	});

	readonly literalesOrdenados = computed(() =>
		[...(this.calificacionConfig()?.literales ?? [])].sort((a, b) => a.orden - b.orden),
	);

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

	readonly grupoStats = computed(() => {
		this._editVersion();
		const cal = this.calificacion();
		const rows = this.grupoNotaRows();
		return calcGrupoStats(rows, this.calificacionConfig(), cal ? notasFueraDeGrupo(cal, rows) : []);
	});

	private readonly gruposPayload = computed(() => {
		this._editVersion();
		return buildGruposPayload(this.grupoNotaRows());
	});

	/** Grupos con excepciones que no se pueden guardar aún (faltan notas de otros miembros). */
	readonly gruposIncompletos = computed(() => this.gruposPayload().incompletos);

	readonly hasChanges = computed(() => {
		this._editVersion();
		if (this.isGrupal()) {
			const { grupos, incompletos } = this.gruposPayload();
			return grupos.length > 0 && incompletos.length === 0;
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

	onEdited(): void {
		this._editVersion.update((v) => v + 1);
	}

	onSave(): void {
		if (this.isGrupal()) {
			this.onSaveGrupos();
		} else {
			this.onSaveIndividual();
		}
	}
	// #endregion

	// #region Helpers privados
	private onSaveIndividual(): void {
		const rows = this.notaRows();
		const notas: CalificarEstudianteDto[] = rows
			.filter((r): r is NotaRow & { nota: number } => r.nota !== null && r.nota !== undefined && r.esEditable)
			.map((r) => ({
				estudianteId: r.estudianteId,
				nota: r.nota,
				observacion: r.observacion || null,
			}));

		if (notas.length === 0) return;
		this.save.emit({ notas });
	}

	private onSaveGrupos(): void {
		const { grupos, incompletos } = this.gruposPayload();
		if (grupos.length === 0 || incompletos.length > 0) return;
		this.saveGrupos.emit({ grupos });
	}
	// #endregion
}
