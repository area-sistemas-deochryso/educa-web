import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EduSelect } from '@edu-ui';
import { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

interface CursoOption {
	label: string;
	value: number;
}

@Component({
	selector: 'app-course-switcher',
	standalone: true,
	imports: [FormsModule, EduSelect],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './course-switcher.component.html',
})
export class CourseSwitcherComponent {
	readonly horarios = input.required<HorarioProfesorDto[]>();
	readonly selectedHorarioId = input<number | null>(null);
	readonly cursoNombre = input<string>('Contenido del Curso');

	readonly courseChange = output<number>();

	readonly cursoOptions = computed<CursoOption[]>(() => {
		const seen = new Set<string>();
		const options: CursoOption[] = [];
		for (const h of this.horarios()) {
			const key = `${h.cursoId}-${h.salonId}`;
			if (!seen.has(key)) {
				seen.add(key);
				options.push({ label: `${h.cursoNombre} - ${h.salonDescripcion}`, value: h.id });
			}
		}
		return options.sort((a, b) => a.label.localeCompare(b.label));
	});

	readonly showSwitcher = computed(() => this.cursoOptions().length > 1);
}
