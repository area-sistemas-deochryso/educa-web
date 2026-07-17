import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import type {
	PersonaAsistenteAdminReporte,
	PersonaProfesorReporte,
	ReporteFiltrado,
	SalonReporteFiltrado,
} from '../../models';

interface SalonSelectOption {
	label: string;
	value: string;
	salon: SalonReporteFiltrado;
}

@Component({
	selector: 'app-reports-result',
	standalone: true,
	imports: [FormsModule, TableModule, SelectModule, DatePipe],
	templateUrl: './reports-result.component.html',
	styleUrl: './reports-result.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsResultComponent {
	// #region Inputs
	readonly resultado = input.required<ReporteFiltrado>();
	// #endregion

	// #region Estado local
	private readonly _selectedSalonKey = signal<string | null>(null);
	private readonly _matrixPage = signal(0);
	readonly matrixPageSize = 15;

	constructor() {
		effect(() => {
			this.effectiveSalonKey();
			this._matrixPage.set(0);
		});
	}

	readonly matrixPage = this._matrixPage.asReadonly();

	readonly paginatedEstudiantes = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		const start = this._matrixPage() * this.matrixPageSize;
		return salon.estudiantes.slice(start, start + this.matrixPageSize);
	});

	readonly totalEstudiantesPages = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return 0;
		return Math.ceil(salon.estudiantes.length / this.matrixPageSize);
	});

	readonly matrixPageOffset = computed(() => this._matrixPage() * this.matrixPageSize);
	// #endregion

	// #region Computed
	readonly esDia = computed(() => this.resultado().rangoTipo === 'dia');

	readonly esMatriz = computed(() => {
		const r = this.resultado();
		if (r.rangoTipo !== 'mes' && r.rangoTipo !== 'semana') return false;
		return r.salones.some(s => s.estudiantes.some(e => e.asistenciasDiarias != null))
			|| r.profesores?.some(p => p.asistenciasDiarias != null) === true
			|| r.asistentesAdmin?.some(a => a.asistenciasDiarias != null) === true
			|| r.coordinadores?.some(a => a.asistenciasDiarias != null) === true
			|| r.promotores?.some(a => a.asistenciasDiarias != null) === true;
	});

	readonly diasColumnas = computed<number[]>(() => {
		const r = this.resultado();
		const dias = this.selectedSalon()?.diasEnMes ?? r.diasEnMes ?? 0;
		if (!dias) return [];
		if (r.rangoTipo === 'semana') {
			const start = new Date(r.fechaInicio + 'T00:00:00');
			return Array.from({ length: dias }, (_, i) => {
				const d = new Date(start);
				d.setDate(start.getDate() + i);
				return d.getDate();
			});
		}
		return Array.from({ length: dias }, (_, i) => i + 1);
	});

	readonly diasSemanaLabels = computed<string[]>(() => {
		const r = this.resultado();
		const dias = this.selectedSalon()?.diasEnMes ?? r.diasEnMes ?? 0;
		if (!dias) return [];
		const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
		if (r.rangoTipo === 'semana') {
			const start = new Date(r.fechaInicio + 'T00:00:00');
			return Array.from({ length: dias }, (_, i) => {
				const d = new Date(start);
				d.setDate(start.getDate() + i);
				return labels[d.getDay()];
			});
		}
		const fecha = new Date(r.fechaInicio);
		return Array.from({ length: dias }, (_, i) => {
			const d = new Date(fecha.getFullYear(), fecha.getMonth(), i + 1);
			return labels[d.getDay()];
		});
	});

	readonly feriadosSet = computed<Set<number>>(() =>
		new Set(this.resultado().diasFeriados ?? []),
	);

	readonly salones = computed<SalonReporteFiltrado[]>(() =>
		this.resultado().salones.filter((s) => s.totalFiltrados > 0),
	);

	readonly profesores = computed<PersonaProfesorReporte[]>(
		() => this.resultado().profesores ?? [],
	);

	readonly asistentesAdmin = computed<PersonaAsistenteAdminReporte[]>(
		() => this.resultado().asistentesAdmin ?? [],
	);

	readonly coordinadores = computed<PersonaAsistenteAdminReporte[]>(
		() => this.resultado().coordinadores ?? [],
	);

	readonly promotores = computed<PersonaAsistenteAdminReporte[]>(
		() => this.resultado().promotores ?? [],
	);

	readonly hasProfesores = computed(() => this.profesores().length > 0);
	readonly hasAsistentesAdmin = computed(() => this.asistentesAdmin().length > 0);
	readonly hasCoordinadores = computed(() => this.coordinadores().length > 0);
	readonly hasPromotores = computed(() => this.promotores().length > 0);
	readonly hasEstudiantes = computed(() => this.salones().length > 0);

	readonly salonOptions = computed<SalonSelectOption[]>(() =>
		this.salones().map((s) => ({
			label: `${s.grado} "${s.seccion}" — ${s.totalFiltrados} de ${s.totalEstudiantes}`,
			value: this.salonKey(s),
			salon: s,
		})),
	);

	readonly hasMultipleSalones = computed(() => this.salonOptions().length > 1);

	/** Devuelve la key efectivamente válida: la seleccionada por el usuario o, si quedó stale, la primera. */
	readonly effectiveSalonKey = computed<string | null>(() => {
		const opts = this.salonOptions();
		if (opts.length === 0) return null;
		const current = this._selectedSalonKey();
		const exists = current !== null && opts.some((o) => o.value === current);
		return exists ? current : opts[0].value;
	});

	readonly selectedSalon = computed<SalonReporteFiltrado | null>(() => {
		const key = this.effectiveSalonKey();
		if (!key) return null;
		return this.salones().find((s) => this.salonKey(s) === key) ?? null;
	});

	readonly profesoresHeader = computed(() => {
		const r = this.resultado();
		return `Profesores — ${r.totalProfesoresFiltrados ?? this.profesores().length} de ${
			r.totalProfesoresGeneral ?? this.profesores().length
		}`;
	});

	readonly asistentesAdminHeader = computed(() => {
		const r = this.resultado();
		return `Asistentes administrativos — ${
			r.totalAsistentesAdminFiltrados ?? this.asistentesAdmin().length
		} de ${r.totalAsistentesAdminGeneral ?? this.asistentesAdmin().length}`;
	});

	readonly coordinadoresHeader = computed(() => {
		const r = this.resultado();
		return `Coordinadores académicos — ${
			r.totalCoordinadoresFiltrados ?? this.coordinadores().length
		} de ${r.totalCoordinadoresGeneral ?? this.coordinadores().length}`;
	});

	readonly promotoresHeader = computed(() => {
		const r = this.resultado();
		return `Promotores — ${
			r.totalPromotoresFiltrados ?? this.promotores().length
		} de ${r.totalPromotoresGeneral ?? this.promotores().length}`;
	});
	// #endregion

	// #region Handlers
	onSelectSalon(key: string): void {
		this._selectedSalonKey.set(key);
	}

	onMatrixPageChange(page: number): void {
		this._matrixPage.set(page);
	}
	// #endregion

	// #region Helpers
	private salonKey(s: SalonReporteFiltrado): string {
		return `${s.grado}|${s.seccion}`;
	}
	// #endregion
}
