import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

import { K6Credential, K6RoleDistribution } from '../../models';
import { LOGIN_ROLE_OPTIONS } from '../../models';

@Component({
	selector: 'app-credentials-dialog',
	standalone: true,
	imports: [
		FormsModule,
		DialogModule,
		ButtonModule,
		InputTextModule,
		PasswordModule,
		SelectModule,
		TagModule,
		TooltipModule,
		ProgressSpinnerModule,
		DividerModule,
		InputNumberModule,
		TextareaModule,
	],
	templateUrl: './credentials-dialog.component.html',
	styleUrl: './credentials-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialsDialogComponent {
	// #region Inputs/Outputs
	readonly visible = input.required<boolean>();
	readonly credentials = input.required<K6Credential[]>();
	readonly loginLoading = input.required<boolean>();
	readonly loginError = input.required<string | null>();
	readonly roleDistribution = input.required<K6RoleDistribution[]>();
	readonly credentialsByRole = input.required<{ rol: string; count: number }[]>();
	readonly totalDistributionVUs = input.required<number>();
	readonly bulkImportResult = input.required<{ added: number; summary: string } | null>();

	readonly visibleChange = output<boolean>();
	readonly testLogin = output<{ dni: string; password: string; rol: string; endpoint: string }>();
	readonly removeCredential = output<string>();
	readonly importBulk = output<string>();
	readonly clearAll = output<void>();
	readonly updateRoleVUs = output<{ rol: string; vus: number }>();
	readonly applyPresetDistribution = output<void>();
	readonly clearBulkResult = output<void>();
	// #endregion

	// #region Estado local
	readonly dni = signal('');
	readonly password = signal('');
	readonly rol = signal('Estudiante');
	readonly loginEndpoint = signal('/api/Auth/login');
	readonly roleOptions = LOGIN_ROLE_OPTIONS;
	readonly bulkText = signal('');
	// #endregion

	// #region Event handlers — Dialog
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
		}
	}
	// #endregion

	// #region Event handlers — Login manual
	onTestLogin(): void {
		const dni = this.dni().trim();
		const password = this.password().trim();
		const rol = this.rol();
		const endpoint = this.loginEndpoint().trim();
		if (!dni || !password || !rol || !endpoint) return;

		this.testLogin.emit({ dni, password, rol, endpoint });
		this.password.set('');
	}

	onRemoveCredential(usuario: string): void {
		this.removeCredential.emit(usuario);
	}
	// #endregion

	// #region Event handlers — Bulk import
	onImportBulk(): void {
		const text = this.bulkText().trim();
		if (!text) return;
		this.importBulk.emit(text);
		this.bulkText.set('');
	}

	onClearAll(): void {
		this.clearAll.emit();
		this.bulkText.set('');
	}

	onClearBulkResult(): void {
		this.clearBulkResult.emit();
	}
	// #endregion

	// #region Event handlers — Distribucion
	onRoleVUsChange(rol: string, vus: number): void {
		this.updateRoleVUs.emit({ rol, vus });
	}

	onApplyPresetDistribution(): void {
		this.applyPresetDistribution.emit();
	}
	// #endregion

	// #region Helpers
	getRolSeverity(rol: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
		const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
			Director: 'danger',
			Profesor: 'info',
			Apoderado: 'warn',
			Estudiante: 'success',
			'Asistente Administrativo': 'secondary',
		};
		return map[rol] ?? 'info';
	}

	getRoleVUs(rol: string): number {
		const dist = this.roleDistribution().find((d) => d.rol === rol);
		return dist?.vus ?? 0;
	}

	getRolePercentage(rol: string): string {
		const total = this.totalDistributionVUs();
		if (total === 0) return '0';
		const dist = this.roleDistribution().find((d) => d.rol === rol);
		return (((dist?.vus ?? 0) / total) * 100).toFixed(1);
	}
	// #endregion
}
