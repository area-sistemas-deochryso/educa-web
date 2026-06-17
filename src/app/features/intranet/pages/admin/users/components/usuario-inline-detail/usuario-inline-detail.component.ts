import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioLista } from '../../models';

@Component({
	selector: 'app-usuario-inline-detail',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './usuario-inline-detail.component.html',
	styleUrl: './usuario-inline-detail.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioInlineDetailComponent {
	readonly usuario = input.required<UsuarioLista>();
}
