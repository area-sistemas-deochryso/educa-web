import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UsuarioLista } from '../../services';
import { buildUsuarioKey } from '../../services/usuarios-pending-saves';
import { RoleTab } from '../../models';
import { hasMissingGuardianEmail, MISSING_GUARDIAN_EMAIL_LABEL } from '../../helpers/usuario-contact.utils';
import { getInitialsFromParts } from '@core/helpers';
import { UiMappingService } from '@intranet-shared/services';
import { FullNamePipe } from '@shared/pipes';
import { CardActionsComponent, CardRowComponent, MobileCardListComponent, injectIsMobile } from '@shared/components';
import { TableLoadingDirective } from '@intranet-shared/directives';
import { EduAvatar, EduButton, EduDialog, EduSortableColumn, EduTable, EduTag, EduTooltip } from '@edu-ui';
import type { EduTableLazyLoadEvent } from '@edu-ui';

@Component({
	selector: 'app-users-table',
	standalone: true,
	imports: [MobileCardListComponent, CardRowComponent, CardActionsComponent, EduAvatar, DatePipe, EduTable, EduButton, EduDialog, EduTag, EduTooltip, TableLoadingDirective, FullNamePipe, EduSortableColumn],
	templateUrl: './usuarios-table.component.html',
	styleUrl: './usuarios-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableComponent {
	readonly uiMapping = inject(UiMappingService);
	readonly isMobile = injectIsMobile();

	readonly usuarios = input.required<UsuarioLista[]>();
	readonly loading = input.required<boolean>();
	readonly totalRecords = input.required<number>();
	readonly rows = input(10);
	readonly first = input(0);
	readonly activeTab = input<RoleTab>(null);
	readonly sortField = input<string | null>(null);
	readonly sortOrder = input<'asc' | 'desc' | null>(null);
	/** Claves `rol:id` de usuarios con un guardado en vuelo (ver `UsersStore.pendingSaveKeys`). */
	readonly pendingSaveKeys = input<ReadonlySet<string>>(new Set());

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

	readonly missingGuardianEmailLabel = MISSING_GUARDIAN_EMAIL_LABEL;
	readonly hasMissingGuardianEmail = hasMissingGuardianEmail;

	isSavePending(usuario: UsuarioLista): boolean {
		return this.pendingSaveKeys().has(buildUsuarioKey(usuario.rol, usuario.id));
	}

	getInitials(usuario: UsuarioLista): string {
		return getInitialsFromParts(usuario.apellidos, usuario.nombres);
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

	/** Las cards no ordenan: se conserva el orden vigente y solo cambia la página. */
	onCardsPage(event: { page: number; rows: number }): void {
		this.lazyLoad.emit({ page: event.page + 1, pageSize: event.rows, sortField: this.sortField(), sortOrder: this.sortOrder() });
	}

	onLazyLoad(event: EduTableLazyLoadEvent): void {
		const first = event.first ?? 0;
		const rows = event.rows ?? this.rows();
		const page = Math.floor(first / rows) + 1;
		const sortField = event.sortField ?? null;
		const sortOrder = event.sortOrder ?? null;
		this.lazyLoad.emit({ page, pageSize: rows, sortField, sortOrder });
	}
}
