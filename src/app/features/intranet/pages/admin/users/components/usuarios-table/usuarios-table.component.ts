import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioLista } from '../../services';
import { RoleTab } from '../../models';
import { UiMappingService } from '@intranet-shared/services';
import { FullNamePipe } from '@shared/pipes';
import { TableLoadingDirective } from '@intranet-shared/directives';
import { EduButton, EduDialog, EduSortableColumn, EduTable, EduTag, EduTooltip } from '@edu-ui';
import type { EduTableLazyLoadEvent } from '@edu-ui';

@Component({
	selector: 'app-users-table',
	standalone: true,
	imports: [CommonModule, EduTable, EduButton, EduDialog, EduTag, EduTooltip, TableLoadingDirective, FullNamePipe, EduSortableColumn],
	templateUrl: './usuarios-table.component.html',
	styleUrl: './usuarios-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableComponent {
	readonly uiMapping = inject(UiMappingService);

	readonly usuarios = input.required<UsuarioLista[]>();
	readonly loading = input.required<boolean>();
	readonly totalRecords = input.required<number>();
	readonly rows = input(10);
	readonly first = input(0);
	readonly activeTab = input<RoleTab>(null);
	readonly sortField = input<string | null>(null);
	readonly sortOrder = input<'asc' | 'desc' | null>(null);

	readonly view = output<UsuarioLista>();
	readonly edit = output<UsuarioLista>();
	readonly toggleEstado = output<UsuarioLista>();
	readonly lazyLoad = output<{
		page: number;
		pageSize: number;
		sortField: string | null;
		sortOrder: 'asc' | 'desc' | null;
	}>();
	readonly copyDni = output<string>();

	readonly colCount = () => {
		const tab = this.activeTab();
		return (tab === null || tab === 'estudiantes') ? 5 : 4;
	};

	readonly salonDialogVisible = signal(false);
	readonly salonDialogUser = signal<UsuarioLista | null>(null);
	readonly salonDialogHeader = computed(() => {
		const u = this.salonDialogUser();
		return u ? `Salones — ${u.nombres} ${u.apellidos}` : 'Salones';
	});
	readonly salonGroups = computed(() => {
		const u = this.salonDialogUser();
		if (!u?.salonesNombres?.length) return null;
		const inicial: string[] = [];
		const primaria: string[] = [];
		const secundaria: string[] = [];
		for (const s of u.salonesNombres) {
			if (s.includes('INICIAL')) inicial.push(s);
			else if (s.includes('PRIMARIA')) primaria.push(s);
			else if (s.includes('SECUNDARIA')) secundaria.push(s);
		}
		return { inicial, primaria, secundaria };
	});

	private initialLoadDone = false;

	getInitials(usuario: UsuarioLista): string {
		const first = usuario.nombres?.charAt(0) ?? '';
		const last = usuario.apellidos?.charAt(0) ?? '';
		return (first + last).toUpperCase();
	}

	hasMultipleSalones(usuario: UsuarioLista): boolean {
		return !!(usuario.salonesNombres && usuario.salonesNombres.length > 0);
	}

	onShowSalones(usuario: UsuarioLista): void {
		this.salonDialogUser.set(usuario);
		this.salonDialogVisible.set(true);
	}

	onView(usuario: UsuarioLista): void {
		this.view.emit(usuario);
	}

	onEdit(usuario: UsuarioLista): void {
		this.edit.emit(usuario);
	}

	onToggleEstado(usuario: UsuarioLista): void {
		this.toggleEstado.emit(usuario);
	}

	onCopyDni(dni: string): void {
		this.copyDni.emit(dni);
	}

	onLazyLoad(event: EduTableLazyLoadEvent): void {
		if (!this.initialLoadDone) {
			this.initialLoadDone = true;
			return;
		}
		const first = event.first ?? 0;
		const rows = event.rows ?? this.rows();
		const page = Math.floor(first / rows) + 1;
		const sortField = event.sortField ?? null;
		const sortOrder = event.sortOrder ?? null;
		this.lazyLoad.emit({ page, pageSize: rows, sortField, sortOrder });
	}
}
