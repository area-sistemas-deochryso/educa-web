import { Injectable, computed, signal } from '@angular/core';
import {
	EstudianteMisNotasDto,
	CalificacionConMiNotaDto,
	VistaPromedio,
	calcularPromedioPonderado,
} from '../../models';
import { NotaSimulada } from './estudiante-notas.models';

interface EstudianteNotasState {
	cursos: EstudianteMisNotasDto[];
	loading: boolean;
	error: string | null;
	selectedCursoIndex: number;
	vistaActual: VistaPromedio;
	// Simulador
	simuladorVisible: boolean;
	simulaciones: Record<string, NotaSimulada[]>; // key: cursoNombre
}

const initialState: EstudianteNotasState = {
	cursos: [],
	loading: false,
	error: null,
	selectedCursoIndex: 0,
	vistaActual: 'semana',
	simuladorVisible: false,
	simulaciones: {},
};

@Injectable({ providedIn: 'root' })
export class EstudianteNotasStore {
	// #region Estado privado
	private readonly _state = signal<EstudianteNotasState>(initialState);
	// #endregion

	// #region Lecturas públicas
	readonly cursos = computed(() => this._state().cursos);
	readonly loading = computed(() => this._state().loading);
	readonly error = computed(() => this._state().error);
	readonly selectedCursoIndex = computed(() => this._state().selectedCursoIndex);
	readonly vistaActual = computed(() => this._state().vistaActual);
	readonly simuladorVisible = computed(() => this._state().simuladorVisible);
	readonly simulaciones = computed(() => this._state().simulaciones);
	// #endregion

	// #region Computed
	readonly selectedCurso = computed<EstudianteMisNotasDto | null>(() => {
		const cursos = this.cursos();
		const idx = this.selectedCursoIndex();
		return cursos[idx] ?? null;
	});

	readonly cursoOptions = computed(() =>
		this.cursos().map((c, i) => ({ label: `${c.cursoNombre} - ${c.salonDescripcion}`, value: i })),
	);

	/** Promedios simulados del curso seleccionado */
	readonly promedioSimulado = computed<number | null>(() => {
		const curso = this.selectedCurso();
		if (!curso) return null;
		const sims = this.simulaciones()[curso.cursoNombre];
		if (!sims || sims.length === 0) return curso.promedios.general;

		const items = sims
			.filter((s) => s.notaSimulada !== null)
			.map((s) => ({ nota: s.notaSimulada!, peso: s.peso }));
		return calcularPromedioPonderado(items);
	});

	readonly totalCursos = computed(() => this.cursos().length);

	readonly vm = computed(() => ({
		cursos: this.cursos(),
		loading: this.loading(),
		error: this.error(),
		selectedCursoIndex: this.selectedCursoIndex(),
		selectedCurso: this.selectedCurso(),
		cursoOptions: this.cursoOptions(),
		vistaActual: this.vistaActual(),
		simuladorVisible: this.simuladorVisible(),
		simulaciones: this.simulaciones(),
		promedioSimulado: this.promedioSimulado(),
		totalCursos: this.totalCursos(),
		isEmpty: this.cursos().length === 0,
	}));
	// #endregion

	// #region Comandos de mutación
	setCursos(cursos: EstudianteMisNotasDto[]): void {
		this._state.update((s) => ({ ...s, cursos }));
	}

	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}

	setError(error: string | null): void {
		this._state.update((s) => ({ ...s, error }));
	}

	setSelectedCursoIndex(index: number): void {
		this._state.update((s) => ({ ...s, selectedCursoIndex: index }));
	}

	setVistaActual(vista: VistaPromedio): void {
		this._state.update((s) => ({ ...s, vistaActual: vista }));
	}
	// #endregion

	// #region Simulador commands
	openSimulador(): void {
		const curso = this.selectedCurso();
		if (!curso) return;

		const key = curso.cursoNombre;
		const existing = this._state().simulaciones[key];
		if (!existing) {
			// Init simulaciones from evaluaciones
			const sims: NotaSimulada[] = curso.evaluaciones.map((e: CalificacionConMiNotaDto) => ({
				calificacionId: e.id,
				notaOriginal: e.nota,
				notaSimulada: e.nota,
				peso: e.peso,
			}));
			this._state.update((s) => ({
				...s,
				simuladorVisible: true,
				simulaciones: { ...s.simulaciones, [key]: sims },
			}));
		} else {
			this._state.update((s) => ({ ...s, simuladorVisible: true }));
		}
	}

	closeSimulador(): void {
		this._state.update((s) => ({ ...s, simuladorVisible: false }));
	}

	updateSimulacion(cursoNombre: string, calificacionId: number, nota: number | null): void {
		this._state.update((s) => {
			const sims = s.simulaciones[cursoNombre];
			if (!sims) return s;
			const updated = sims.map((sim) =>
				sim.calificacionId === calificacionId ? { ...sim, notaSimulada: nota } : sim,
			);
			return { ...s, simulaciones: { ...s.simulaciones, [cursoNombre]: updated } };
		});
	}

	resetSimulacion(cursoNombre: string): void {
		this._state.update((s) => {
			const sims = s.simulaciones[cursoNombre];
			if (!sims) return s;
			const reset = sims.map((sim) => ({ ...sim, notaSimulada: sim.notaOriginal }));
			return { ...s, simulaciones: { ...s.simulaciones, [cursoNombre]: reset } };
		});
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}
