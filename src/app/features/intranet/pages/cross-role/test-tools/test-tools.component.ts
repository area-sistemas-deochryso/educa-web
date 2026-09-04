// #region Imports
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

import { PageHeaderComponent } from '@intranet-shared/components';
import { EduButton } from '@edu-ui';

import { CrosschexTriggerFormComponent } from './components/crosschex-trigger-form/crosschex-trigger-form.component';
import { SalonesBulkCreateComponent } from './components/salones-bulk-create/salones-bulk-create.component';
import { CursosBulkCreateComponent } from './components/cursos-bulk-create/cursos-bulk-create.component';
import { UsuariosBulkCreateComponent } from './components/usuarios-bulk-create/usuarios-bulk-create.component';

// #endregion
// #region Component
@Component({
	selector: 'app-test-tools',
	standalone: true,
	imports: [
		PageHeaderComponent,
		CrosschexTriggerFormComponent,
		SalonesBulkCreateComponent,
		CursosBulkCreateComponent,
		UsuariosBulkCreateComponent,
		EduButton,
	],
	templateUrl: './test-tools.component.html',
	styleUrl: './test-tools.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestToolsComponent {
	private readonly router = inject(Router);

	onGoToEmailOutbox(): void {
		this.router.navigate(['/intranet/admin/monitoreo/correos/bandeja']);
	}
}
// #endregion
