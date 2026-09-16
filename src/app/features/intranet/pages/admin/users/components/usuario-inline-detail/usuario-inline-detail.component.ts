import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UsuarioLista } from '../../models';

@Component({
	selector: 'app-usuario-inline-detail',
	standalone: true,
	imports: [],
	templateUrl: './usuario-inline-detail.component.html',
	styleUrl: './usuario-inline-detail.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioInlineDetailComponent {
	readonly usuario = input.required<UsuarioLista>();
}
