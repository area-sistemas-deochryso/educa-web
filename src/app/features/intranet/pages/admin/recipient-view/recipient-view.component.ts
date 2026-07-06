// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '@intranet-shared/components';

import { RecipientViewActionsFacade } from './facades/recipient-view-actions.facade';
import { RecipientViewDataFacade } from './facades/recipient-view-data.facade';
// #endregion

@Component({
	selector: 'app-recipient-view',
	standalone: true,
	imports: [
		DatePipe,
		RouterLink,
		ButtonModule,
		ConfirmDialogModule,
		TagModule,
		TooltipModule,
		PageHeaderComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './recipient-view.component.html',
	styleUrl: './recipient-view.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipientViewComponent implements OnInit {
	// #region Dependencies
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private facade = inject(RecipientViewDataFacade);
	private actions = inject(RecipientViewActionsFacade);
	private confirmationService = inject(ConfirmationService);
	// #endregion

	// #region State
	readonly summary = this.facade.summary;
	readonly loading = this.facade.loading;
	readonly error = this.facade.error;

	readonly correo = computed(() => {
		const param = this.route.snapshot.paramMap.get('correo');
		return param ? decodeURIComponent(param) : '';
	});

	readonly blacklistActive = computed(() => this.summary()?.blacklist.activo ?? false);
	readonly quarantineActive = computed(() => this.summary()?.quarantine.activo ?? false);
	readonly hasAuditProblem = computed(() => this.summary()?.audit.tieneProblema ?? false);
	readonly actionInFlight = this.actions.actionInFlight;
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		const email = this.correo();
		if (email) {
			void this.facade.load(email);
		}
	}
	// #endregion

	// #region Handlers
	goBack(): void {
		void this.router.navigate(['../../'], { relativeTo: this.route });
	}

	refresh(): void {
		const email = this.correo();
		if (email) {
			void this.facade.load(email);
		}
	}

	toggleBlacklist(): void {
		const correo = this.correo();
		if (!correo) return;

		const active = this.blacklistActive();
		this.confirmationService.confirm({
			header: active ? 'Desbloquear correo' : 'Bloquear correo',
			message: active
				? `¿Estás seguro de desbloquear "${correo}"? Volverá a recibir intentos de envío.`
				: `¿Estás seguro de bloquear "${correo}"? Dejará de recibir correos hasta que se desbloquee.`,
			acceptLabel: active ? 'Desbloquear' : 'Bloquear',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: active ? 'p-button-warning' : 'p-button-danger',
			rejectButtonStyleClass: 'p-button-text',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				void (active ? this.actions.blacklistUnblock(correo) : this.actions.blacklistAdd(correo)).then(
					(ok) => ok && this.refresh(),
				);
			},
		});
	}

	releaseQuarantine(): void {
		const correo = this.correo();
		if (!correo) return;

		this.confirmationService.confirm({
			header: 'Liberar cuarentena',
			message: `¿Estás seguro de liberar la cuarentena de "${correo}"?`,
			acceptLabel: 'Liberar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-warning',
			rejectButtonStyleClass: 'p-button-text',
			icon: 'pi pi-exclamation-triangle',
			accept: () => {
				void this.actions.releaseQuarantine(correo).then((ok) => ok && this.refresh());
			},
		});
	}
	// #endregion
}
