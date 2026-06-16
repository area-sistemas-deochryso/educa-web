import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';

import { PageHeaderComponent } from '@intranet-shared/components/page-header/page-header.component';
import { PERMISOS, PermisoKey, PermisoPath } from '@shared/constants';

interface VistaEntry {
	key: PermisoKey;
	path: PermisoPath;
	segment: string;
}

const SEGMENTS = ['admin', 'profesor', 'estudiante', 'compartido'] as const;

function extractSegment(path: string): string {
	const parts = path.split('/');
	if (parts[1] === 'admin') return 'admin';
	if (parts[1] === 'profesor') return 'profesor';
	if (parts[1] === 'estudiante') return 'estudiante';
	return 'compartido';
}

@Component({
	selector: 'app-view-registry',
	standalone: true,
	imports: [
		FormsModule,
		RouterLink,
		ButtonModule,
		TableModule,
		InputTextModule,
		IconFieldModule,
		InputIconModule,
		TagModule,
		SelectModule,
		PageHeaderComponent,
	],
	templateUrl: './view-registry.component.html',
	styleUrl: './view-registry.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewRegistryComponent {
	readonly filterText = signal('');
	readonly selectedSegment = signal<string | null>(null);

	readonly segmentOptions = SEGMENTS.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }));

	private readonly allEntries: VistaEntry[] = (Object.entries(PERMISOS) as [PermisoKey, PermisoPath][]).map(
		([key, path]) => ({ key, path, segment: extractSegment(path) }),
	);

	readonly entries = computed(() => {
		const text = this.filterText().toLowerCase();
		const seg = this.selectedSegment();
		return this.allEntries.filter((e) => {
			if (seg && e.segment !== seg) return false;
			if (text && !e.key.toLowerCase().includes(text) && !e.path.toLowerCase().includes(text)) return false;
			return true;
		});
	});

	readonly totalCount = this.allEntries.length;

	toggleSegment(segment: string): void {
		this.selectedSegment.update((current) => (current === segment ? null : segment));
	}

	segmentSeverity(segment: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
		switch (segment) {
			case 'admin':
				return 'danger';
			case 'profesor':
				return 'info';
			case 'estudiante':
				return 'success';
			default:
				return 'secondary';
		}
	}
}
