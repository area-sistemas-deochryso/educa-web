import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { logger } from '@core/helpers';
import { PageHeaderComponent } from '@intranet-shared/components';
import {
	EduButton,
	EduDatePicker,
	EduDialog,
	EduInputText,
	EduMultiSelect,
	EduPaginator,
	EduTable,
	EduTag,
	EduTooltip,
} from '@edu-ui';
import type { EduPaginatorPageEvent, EduTagSeverity } from '@edu-ui';

import {
	DetailInfo,
	DetailKind,
	ESTADO_LEGEND,
	INTERACTION_DETAILS,
	SUPPRESSION_DETAILS,
	detailInfo,
} from './mailersend-detail-catalog';

import { MAILERSEND_ESTADOS, MailerSendEmail, MailerSendEstado } from './mailersend-activity.models';
import { MailerSendActivityService } from './mailersend-activity.service';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const ESTADO_LABELS: Record<MailerSendEstado, string> = {
	queued: 'En cola',
	sent: 'Enviado',
	delivered: 'Entregado',
	rejected: 'Rechazado',
};

const ESTADO_SEVERITY: Record<MailerSendEstado, EduTagSeverity> = {
	queued: 'warn',
	sent: 'info',
	delivered: 'success',
	rejected: 'danger',
};

const ESTADO_OPTIONS = MAILERSEND_ESTADOS.map((value) => ({ label: ESTADO_LABELS[value], value }));

// Partículas que forman parte de un apellido compuesto («DE LA CRUZ», «DEL ROSARIO»).
const SURNAME_PARTICLES = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'VAN', 'VON', 'Y']);

const DEFAULT_ESTADOS: MailerSendEstado[] = ['queued', 'rejected'];

@Component({
	selector: 'app-mailersend-activity',
	standalone: true,
	imports: [
		DatePipe,
		FormsModule,
		RouterLink,
		PageHeaderComponent,
		EduButton,
		EduDatePicker,
		EduDialog,
		EduInputText,
		EduMultiSelect,
		EduPaginator,
		EduTable,
		EduTag,
		EduTooltip,
	],
	templateUrl: './mailersend-activity.component.html',
	styleUrl: './mailersend-activity.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailerSendActivityComponent implements OnInit {
	private readonly api = inject(MailerSendActivityService);
	private readonly destroyRef = inject(DestroyRef);

	readonly estadoOptions = ESTADO_OPTIONS;
	readonly suppressionDetails = SUPPRESSION_DETAILS;
	readonly interactionDetails = INTERACTION_DETAILS;
	readonly estadoLegend = ESTADO_LEGEND;
	readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

	readonly desde = signal<Date>(this.startOfDay(new Date()));
	readonly hasta = signal<Date>(this.startOfDay(new Date()));
	readonly estados = signal<MailerSendEstado[]>([...DEFAULT_ESTADOS]);
	readonly destinatario = signal('');
	readonly page = signal(1);
	readonly limit = signal<number>(25);

	readonly items = signal<MailerSendEmail[]>([]);
	readonly hasNext = signal(false);
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);

	// Modal con el significado de un «Detalle» (siempre en el DOM; solo cambia `visible`).
	readonly detailVisible = signal(false);
	readonly selectedDetail = signal<DetailInfo | null>(null);

	readonly first = computed(() => (this.page() - 1) * this.limit());

	// MailerSend no devuelve el total: se usa el mínimo conocido (+1 si hay página siguiente)
	// para que el paginador ofrezca la página siguiente y el reporte no invente un total.
	readonly totalRecords = computed(() =>
		this.hasNext() ? this.page() * this.limit() + 1 : this.first() + this.items().length,
	);

	ngOnInit(): void {
		this.load();
	}

	severityOf(status: string): EduTagSeverity {
		return ESTADO_SEVERITY[status as MailerSendEstado] ?? 'secondary';
	}

	labelOf(status: string): string {
		return ESTADO_LABELS[status as MailerSendEstado] ?? status;
	}

	/** Valores de la columna «Detalle» de un email: motivo de rechazo + interacciones. */
	detailsOf(mail: MailerSendEmail): DetailInfo[] {
		const details: DetailInfo[] = [];
		if (mail.suppressionReason) details.push(detailInfo('suppression', mail.suppressionReason));
		for (const code of mail.interaction) details.push(detailInfo('interaction', code));
		return details;
	}

	/** Nombre del usuario: los asuntos son «Registro de Entrada - APELLIDOS NOMBRES». */
	userNameOf(subject: string | null): string | null {
		const idx = subject?.indexOf(' - ') ?? -1;
		if (!subject || idx < 0) return null;
		return subject.slice(idx + 3).trim() || null;
	}

	/**
	 * El asunto trae «APELLIDOS NOMBRES», pero el buscador de Usuarios filtra por «NOMBRES APELLIDOS»:
	 * se toman 2 apellidos (con sus partículas) y se pasan al final.
	 */
	searchTermOf(name: string): string {
		const tokens = name.split(/\s+/).filter(Boolean);
		let end = 0;
		for (let surname = 0; surname < 2 && end < tokens.length; surname++) {
			while (end < tokens.length - 1 && SURNAME_PARTICLES.has(tokens[end].toUpperCase())) end++;
			end++;
		}
		if (end >= tokens.length) return name;
		return [...tokens.slice(end), ...tokens.slice(0, end)].join(' ');
	}

	openDetail(kind: DetailKind, code: string): void {
		this.selectedDetail.set(detailInfo(kind, code));
		this.detailVisible.set(true);
	}

	onDetailVisibleChange(visible: boolean): void {
		this.detailVisible.set(visible);
	}

	// Cada filtro se aplica al cambiar (MailerSend limita a 10 consultas/min; el BE cachea 30 s por combinación).
	onDesdeChange(value: Date | null): void {
		if (!value) return;
		this.desde.set(value);
		this.search();
	}

	onHastaChange(value: Date | null): void {
		if (!value) return;
		this.hasta.set(value);
		this.search();
	}

	onEstadosChange(value: MailerSendEstado[] | null): void {
		this.estados.set(value ?? []);
		this.search();
	}

	onDestinatarioApply(): void {
		this.search();
	}

	onPageChange(event: EduPaginatorPageEvent): void {
		if (event.rows !== this.limit()) {
			this.limit.set(event.rows);
			this.search();
			return;
		}
		this.goTo(event.page + 1);
	}

	clearFilters(): void {
		const today = this.startOfDay(new Date());
		this.desde.set(today);
		this.hasta.set(today);
		this.estados.set([...DEFAULT_ESTADOS]);
		this.destinatario.set('');
		this.search();
	}

	search(): void {
		this.page.set(1);
		this.load();
	}

	goTo(page: number): void {
		if (page < 1) return;
		this.page.set(page);
		this.load();
	}

	load(): void {
		const desde = this.startOfDay(this.desde());
		const hasta = this.endOfDay(this.hasta());
		if (desde >= hasta) {
			this.error.set("'Desde' debe ser anterior a 'Hasta'.");
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		this.api
			.list({
				desde,
				hasta,
				estados: this.estados(),
				destinatario: this.destinatario(),
				page: this.page(),
				limit: this.limit(),
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.items.set(result.items);
					this.hasNext.set(result.hasNext);
					this.loading.set(false);
				},
				error: (err: { error?: { message?: string } }) => {
					logger.tagged('MailerSendActivity', 'error', 'No se pudo cargar', err);
					this.items.set([]);
					this.hasNext.set(false);
					this.error.set(err?.error?.message ?? 'No se pudo consultar MailerSend.');
					this.loading.set(false);
				},
			});
	}

	private startOfDay(date: Date): Date {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	private endOfDay(date: Date): Date {
		const d = new Date(date);
		d.setHours(23, 59, 59, 0);
		return d;
	}
}
