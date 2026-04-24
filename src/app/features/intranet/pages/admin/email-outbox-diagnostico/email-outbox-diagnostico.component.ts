import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';

import { TabCorreoIndividualComponent } from './tab-correo-individual/tab-correo-individual.component';
import { TabCorreosDiaComponent } from './tab-correos-dia/tab-correos-dia.component';

type TabId = 'gap' | 'correo';

const TAB_IDS: readonly TabId[] = ['gap', 'correo'] as const;

@Component({
	selector: 'app-email-outbox-diagnostico',
	standalone: true,
	imports: [TabsModule, TabCorreosDiaComponent, TabCorreoIndividualComponent],
	templateUrl: './email-outbox-diagnostico.component.html',
	styleUrl: './email-outbox-diagnostico.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxDiagnosticoComponent {
	// #region Dependencias
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Query params
	private readonly queryParams = toSignal(
		this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)),
		{ initialValue: null },
	);

	readonly activeTab = computed<TabId>(() => {
		const raw = this.queryParams()?.get('tab') ?? 'gap';
		return (TAB_IDS as readonly string[]).includes(raw) ? (raw as TabId) : 'gap';
	});

	readonly initialCorreo = computed<string | null>(() => {
		return this.queryParams()?.get('correo') ?? null;
	});
	// #endregion

	// #region Handlers
	onTabChange(value: string | number | undefined): void {
		if (value == null) return;
		const tab = String(value) as TabId;
		if (!(TAB_IDS as readonly string[]).includes(tab)) return;
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { tab },
			queryParamsHandling: 'merge',
		});
	}
	// #endregion
}
