// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { PageHeaderComponent } from '@intranet-shared/components';
import { EduTab, EduTabs } from '@edu-ui';
// #endregion

interface ShellTab {
	value: 'panel' | 'registrar' | 'estado-cuenta' | 'sin-dato' | 'consistencia' | 'configurar-anio' | 'importar';
	label: string;
	icon: string;
}

const TABS: ShellTab[] = [
	{ value: 'panel', label: 'Panel de cobranza', icon: 'pi pi-chart-pie' },
	{ value: 'registrar', label: 'Registrar pago', icon: 'pi pi-plus-circle' },
	{ value: 'estado-cuenta', label: 'Estado de cuenta', icon: 'pi pi-file' },
	{ value: 'sin-dato', label: 'Sin dato', icon: 'pi pi-question-circle' },
	{ value: 'consistencia', label: 'Consistencia', icon: 'pi pi-exclamation-triangle' },
	{ value: 'configurar-anio', label: 'Configurar año', icon: 'pi pi-cog' },
	{ value: 'importar', label: 'Importar', icon: 'pi pi-upload' },
];

interface ShellHeader {
	icon: string;
	title: string;
	subtitle: string;
}

/** Encabezado por pestaña. Es uno solo y vive en el shell (design-system B12); solo cambian sus textos. */
const HEADERS: Record<ShellTab['value'], ShellHeader> = {
	panel: {
		icon: 'pi pi-chart-pie',
		title: 'Panel de cobranza',
		subtitle: 'Cuántos alumnos están al día y cuánto dinero falta cobrar',
	},
	registrar: {
		icon: 'pi pi-plus-circle',
		title: 'Registrar pago',
		subtitle: 'Para anotar un pago hecho en el banco, por transferencia o en el colegio',
	},
	'estado-cuenta': {
		icon: 'pi pi-file',
		title: 'Estado de cuenta',
		subtitle: 'Todo lo que debe y lo que ha pagado un alumno, en un solo lugar',
	},
	'sin-dato': {
		icon: 'pi pi-question-circle',
		title: 'Sin dato',
		subtitle: 'Cargos que el sistema no sabe si se pagaron: no cuentan como deuda',
	},
	consistencia: {
		icon: 'pi pi-exclamation-triangle',
		title: 'Consistencia',
		subtitle: 'Matriculados que no tienen cargos y cargos de alumnos que no están matriculados',
	},
	'configurar-anio': {
		icon: 'pi pi-cog',
		title: 'Configurar año',
		subtitle: 'Parámetros, montos y cronograma del año, y la generación de sus cargos',
	},
	importar: {
		icon: 'pi pi-upload',
		title: 'Importar',
		subtitle: 'Saldos, pagos anteriores y descuentos desde la plantilla de Excel',
	},
};

const HEADER_POR_DEFECTO = HEADERS.panel;

/**
 * Shell del módulo Pagos: rutas hijas reales por pestaña (mismo patrón que `AttendancesShellComponent`).
 * Todas heredan `permissionPath: 'intranet/admin/pagos'` desde `intranet.routes.ts`.
 */
@Component({
	selector: 'app-pagos-shell',
	standalone: true,
	imports: [RouterOutlet, EduTab, EduTabs, PageHeaderComponent],
	templateUrl: './pagos-shell.component.html',
	styles: `
		edu-tabs {
			display: block;
			margin-bottom: 1rem;
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagosShellComponent {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);

	readonly tabs = TABS;

	/** La pestaña de la ruta vigente: cambia solo cuando una navegación termina. */
	private readonly routeTab = toSignal(
		this.router.events.pipe(
			filter((e) => e instanceof NavigationEnd),
			map(() => this.resolveActiveTab()),
		),
		{ initialValue: this.resolveActiveTab() },
	);

	/**
	 * La pestaña marcada. Sigue a la ruta, pero se adelanta al elegir otra (la tira ya la marcó): así, si la navegación
	 * se cancela («Quedarme» ante cambios sin guardar en «Configurar año»), volver a la de la ruta es un cambio que la
	 * tira ve.
	 */
	readonly activeTab = linkedSignal(() => this.routeTab());

	readonly header = computed(
		() => HEADERS[this.routeTab() as ShellTab['value']] ?? HEADER_POR_DEFECTO,
	);

	onTabChange(value: string | number | undefined): void {
		if (value === undefined) return;
		const revert = () => this.activeTab.set(this.routeTab());
		this.activeTab.set(String(value));
		void this.router.navigate([String(value)], { relativeTo: this.route }).then((navigated) => {
			if (!navigated) revert();
		}, revert);
	}

	private resolveActiveTab(): string {
		return this.route.firstChild?.snapshot?.url?.[0]?.path ?? 'panel';
	}
}
