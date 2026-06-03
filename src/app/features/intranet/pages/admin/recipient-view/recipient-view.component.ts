// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { PageHeaderComponent } from '@intranet-shared/components';

import { RecipientViewDataFacade } from './facades/recipient-view-data.facade';
// #endregion

@Component({
	selector: 'app-recipient-view',
	standalone: true,
	imports: [
		DatePipe,
		ButtonModule,
		TabsModule,
		TagModule,
		TooltipModule,
		PageHeaderComponent,
	],
	templateUrl: './recipient-view.component.html',
	styleUrl: './recipient-view.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipientViewComponent implements OnInit {
	// #region Dependencies
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private facade = inject(RecipientViewDataFacade);
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
	// #endregion
}
