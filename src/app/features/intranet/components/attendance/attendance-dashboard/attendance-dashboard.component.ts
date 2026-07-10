import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { firstValueFrom } from 'rxjs';
import { EstadisticasMultiRolDia, TipoPersona } from '@data/models';
import { DirectorAttendanceApiService } from '@intranet-shared/services';
import { logger } from '@core/helpers';

const ROL_CONFIG: Record<TipoPersona, { label: string; icon: string }> = {
	E: { label: 'Estudiantes', icon: 'pi pi-graduation-cap' },
	P: { label: 'Profesores', icon: 'pi pi-user' },
	A: { label: 'Asist. Admin', icon: 'pi pi-id-card' },
	C: { label: 'Coordinadores', icon: 'pi pi-briefcase' },
	M: { label: 'Promotores', icon: 'pi pi-megaphone' },
	D: { label: 'Directores', icon: 'pi pi-building' },
	N: { label: 'Administradores', icon: 'pi pi-cog' },
};

const ROL_ORDER: TipoPersona[] = ['E', 'P', 'A', 'C', 'M', 'D', 'N'];

export interface RoleChip {
	tipo: TipoPersona;
	label: string;
	icon: string;
	count: string;
	hasData: boolean;
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

	readonly selectedRole = input<TipoPersona>('E');
	readonly viewMode = input<string>('dia');
	readonly roleSelect = output<TipoPersona>();

	readonly loading = signal(true);
	readonly data = signal<EstadisticasMultiRolDia | null>(null);

	readonly visibleRoles = computed(() => {
		const d = this.data();
		if (!d) return [];
		return [...d.roles]
			.filter((r) => r.total > 0)
			.sort((a, b) => ROL_ORDER.indexOf(a.tipoPersona) - ROL_ORDER.indexOf(b.tipoPersona));
	});

	readonly roleChips = computed<RoleChip[]>(() => {
		const d = this.data();
		const isMonth = this.viewMode() === 'mes';
		return ROL_ORDER.map((tipo) => {
			const rol = d?.roles.find((r) => r.tipoPersona === tipo);
			const config = ROL_CONFIG[tipo];
			const hasData = !!rol && rol.total > 0;
			return {
				tipo,
				label: config.label,
				icon: config.icon,
				count: hasData ? (isMonth ? `${rol!.total}` : `${rol!.conEntrada}/${rol!.total}`) : '—',
				hasData,
			};
		});
	});

	onRoleSelect(tipo: TipoPersona): void {
		this.roleSelect.emit(tipo);
	}

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
