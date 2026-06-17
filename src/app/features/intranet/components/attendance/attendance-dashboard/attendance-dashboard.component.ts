import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { firstValueFrom } from 'rxjs';
import { DashboardDirectorDia } from '@data/models';
import { DirectorAttendanceApiService } from '@features/intranet/shared/services/attendance/director-attendance-api.service';
import { logger } from '@core/helpers';

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
	readonly data = signal<DashboardDirectorDia | null>(null);

	readonly porcentaje = computed(() => this.data()?.porcentajeAsistencia ?? 0);
	readonly progressColor = computed(() => {
		const p = this.porcentaje();
		if (p >= 90) return 'var(--green-500)';
		if (p >= 70) return 'var(--yellow-500)';
		return 'var(--red-500)';
	});

	readonly alerts = computed(() => {
		const d = this.data();
		if (!d) return [];
		const result: { icon: string; label: string; severity: string }[] = [];
		if (d.salonesSinRegistro > 0) {
			result.push({
				icon: 'pi pi-exclamation-triangle',
				label: `${d.salonesSinRegistro} ${d.salonesSinRegistro === 1 ? 'salón' : 'salones'} sin registro`,
				severity: 'warn',
			});
		}
		return result;
	});

	ngOnInit(): void {
		this.loadDashboard();
	}

	async loadDashboard(): Promise<void> {
		this.loading.set(true);
		try {
			const result = await firstValueFrom(this.api.getDashboard());
			this.data.set(result);
		} catch {
			logger.error('Error loading attendance dashboard');
			this.data.set(null);
		} finally {
			this.loading.set(false);
		}
	}
}
