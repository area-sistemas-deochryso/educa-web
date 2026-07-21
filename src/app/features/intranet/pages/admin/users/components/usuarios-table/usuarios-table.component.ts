import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioLista } from '../../services';
import { RoleTab } from '../../models';
import { UiMappingService } from '@intranet-shared/services';
import { FullNamePipe } from '@shared/pipes';
import { TableLoadingDirective } from '@intranet-shared/directives';

@Component({
	selector: 'app-users-table',
	standalone: true,
	imports: [CommonModule, TableModule, ButtonModule, DialogModule, TagModule, TooltipModule, TableLoadingDirective, FullNamePipe],
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

	readonly edit = output<UsuarioLista>();
	readonly toggleEstado = output<UsuarioLista>();
	readonly lazyLoad = output<{
		page: number;
		pageSize: number;
		sortField: string | null;
		sortOrder: 'asc' | 'desc' | null;
	}>();
	readonly copyDni = output<string>();

	readonly primeSortOrder = computed(() => {
		const order = this.sortOrder();
		return order === 'asc' ? 1 : order === 'desc' ? -1 : 0;
	});

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

	onEdit(usuario: UsuarioLista): void {
		this.edit.emit(usuario);
	}

	onToggleEstado(usuario: UsuarioLista): void {
		this.toggleEstado.emit(usuario);
	}

	onCopyDni(dni: string): void {
		this.copyDni.emit(dni);
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		if (!this.initialLoadDone) {
			this.initialLoadDone = true;
			return;
		}
		const first = event.first ?? 0;
		const rows = event.rows ?? this.rows();
		const page = Math.floor(first / rows) + 1;
		const sortField = Array.isArray(event.sortField) ? event.sortField[0] ?? null : event.sortField ?? null;
		const sortOrder = event.sortOrder === 1 ? 'asc' : event.sortOrder === -1 ? 'desc' : null;
		this.lazyLoad.emit({ page, pageSize: rows, sortField, sortOrder });
	}
}
