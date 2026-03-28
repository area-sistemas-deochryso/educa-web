import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { CampusNodoDto, CampusPisoDto, VerticalConnectionFormData, VerticalConnectionType } from '../../models';

@Component({
	selector: 'app-campus-vertical-connection-dialog',
	standalone: true,
	imports: [DecimalPipe, FormsModule, ButtonModule, DialogModule, InputNumberModule, SelectModule, ToggleSwitchModule],
	templateUrl: './campus-vertical-connection-dialog.component.html',
	styleUrl: './campus-vertical-connection-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusVerticalConnectionDialogComponent {
	// #region Inputs / Outputs

	readonly visible = input(false);
	readonly formData = input.required<VerticalConnectionFormData>();
	readonly otherPisos = input.required<CampusPisoDto[]>();
	readonly destPisoNodos = input<CampusNodoDto[]>([]);
	readonly destPisoLoading = input(false);
	readonly typeOptions = input.required<{ label: string; value: VerticalConnectionType }[]>();
	readonly saving = input(false);

	readonly visibleChange = output<boolean>();
	readonly save = output<void>();
	readonly destPisoChange = output<number | null>();
	readonly formDataChange = output<Partial<VerticalConnectionFormData>>();

	// #endregion

	// #region Event handlers

	onVisibleChange(value: boolean): void {
		this.visibleChange.emit(value);
	}

	onTipoChange(value: VerticalConnectionType): void {
		this.formDataChange.emit({ tipo: value });
	}

	onDestPisoChange(pisoId: number | null): void {
		this.formDataChange.emit({ destPisoId: pisoId, destNodoId: null });
		this.destPisoChange.emit(pisoId);
	}

	onDestNodoChange(nodoId: number | null): void {
		this.formDataChange.emit({ destNodoId: nodoId });
	}

	onPesoSubidaChange(value: number): void {
		this.formDataChange.emit({ pesoSubida: value });
	}

	onPesoBajadaChange(value: number): void {
		this.formDataChange.emit({ pesoBajada: value });
	}

	onBidireccionalChange(value: boolean): void {
		this.formDataChange.emit({ bidireccional: value });
	}

	onSave(): void {
		this.save.emit();
	}

	onCancel(): void {
		this.visibleChange.emit(false);
	}

	// #endregion
}
