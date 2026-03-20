// #region Imports
import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@shared/components';
import { VideoconferenciasFacade } from './services/videoconferencias.facade';
import { VideoconferenciaItem } from './services/videoconferencias.store';
import { VideoconferenciaSalaComponent } from './components/videoconferencia-sala/videoconferencia-sala.component';

// #endregion

@Component({
	selector: 'app-videoconferencias',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		TagModule,
		TooltipModule,
		ProgressSpinnerModule,
		PageHeaderComponent,
		VideoconferenciaSalaComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './videoconferencias.component.html',
	styleUrl: './videoconferencias.component.scss',
})
export class VideoconferenciasComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(VideoconferenciasFacade);
	// #endregion

	// #region Estado del facade
	readonly vm = this.facade.vm;
	// #endregion

	// #region Computed locales
	readonly activeRoomName = computed(() => {
		const sala = this.vm().activeSala;
		if (!sala) return '';
		return this.facade.getRoomName(sala.horarioId, sala.cursoNombre);
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadCursos();
	}
	// #endregion

	// #region Event handlers
	onRetry(): void {
		this.facade.loadCursos();
	}

	onUnirse(item: VideoconferenciaItem): void {
		this.facade.enterSala(item);
	}
	// #endregion
}
