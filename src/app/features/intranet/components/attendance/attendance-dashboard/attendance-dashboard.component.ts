import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { firstValueFrom } from 'rxjs';
import { EstadisticasMultiRolDia, EstadisticasRol, TipoPersona } from '@data/models';
import { DirectorAttendanceApiService } from '@features/intranet/shared/services/attendance/director-attendance-api.service';
import { logger } from '@core/helpers';

const ROL_LABELS: Record<string, string> = {
	E: 'estudiantes',
	P: 'profesores',
	A: 'asist. admin',
	C: 'coordinadores',
	M: 'promotores',
	D: 'directores',
};

const ROL_ORDER: TipoPersona[] = ['E', 'P', 'A', 'C', 'M', 'D'];

const ROL_VISIBLE: Record<TipoPersona, boolean> = {
	E: true,
	P: true,
	A: true,
	C: true,
	M: false,
	D: false,
};

interface RolSummary {
	label: string;
	conEntrada: number;
	total: number;
}

@Component({
	selector: 'app-attendance-dashboard',
	standalone: true,
	imports: [CommonModule, TooltipModule, SkeletonModule],
	templateUrl: './attendance-dashboard.component.html',
	styleUrl: './attendance-dashboard.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDashboardComponent implements OnInit {
	private readonly api = inject(DirectorAttendanceApiService);

	readonly loading = signal(true);
	readonly data = signal<EstadisticasMultiRolDia | null>(null);

	readonly visibleRoles = computed(() => {
		const d = this.data();
		if (!d) return [];
		return [...d.roles]
			.filter((r) => r.total > 0 && ROL_VISIBLE[r.tipoPersona])
			.sort((a, b) => ROL_ORDER.indexOf(a.tipoPersona) - ROL_ORDER.indexOf(b.tipoPersona));
	});

	readonly rolSummaries = computed<RolSummary[]>(() =>
		this.visibleRoles().map((r) => ({
			label: ROL_LABELS[r.tipoPersona] ?? r.tipoPersona,
			conEntrada: r.conEntrada,
			total: r.total,
		})),
	);

	readonly porcentaje = computed(() => {
		const roles = this.visibleRoles();
		const totalPersonas = roles.reduce((sum, r) => sum + r.total, 0);
		const totalPresentes = roles.reduce((sum, r) => sum + r.conEntrada, 0);
		return totalPersonas > 0 ? Math.round((totalPresentes / totalPersonas) * 10000) / 100 : 0;
	});

	readonly progressColor = computed(() => {
		const p = this.porcentaje();
		if (p >= 90) return 'var(--green-500)';
		if (p >= 70) return 'var(--yellow-500)';
		return 'var(--red-500)';
	});

	readonly totalFaltas = computed(() =>
		this.visibleRoles().reduce((sum, r) => sum + r.faltas, 0),
	);

	readonly alerts = computed(() => {
		const d = this.data();
		if (!d || d.totalSalones == null || d.salonesConRegistro == null) return [];
		const sinRegistro = d.totalSalones - d.salonesConRegistro;
		if (sinRegistro <= 0) return [];
		return [
			{
				icon: 'pi pi-exclamation-triangle',
				label: `${sinRegistro} ${sinRegistro === 1 ? 'salón' : 'salones'} sin registro`,
				severity: 'warn',
			},
		];
	});

	ngOnInit(): void {
		this.loadDashboard();
	}

	async loadDashboard(): Promise<void> {
		this.loading.set(true);
		try {
			const result = await firstValueFrom(this.api.getEstadisticasMultiRol(undefined, true));
			this.data.set(result);
		} catch {
			logger.error('Error loading attendance dashboard');
			this.data.set(null);
		} finally {
			this.loading.set(false);
		}
	}
}
