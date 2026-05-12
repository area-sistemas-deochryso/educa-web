import { ActivatedRoute } from '@angular/router';
import { Signal, WritableSignal } from '@angular/core';

import type { UsuarioLista } from '../services';

export interface AutoOpenTarget {
	id: number;
	rol: string;
}

/**
 * Plan 43 Chat 2.1 (A13) — lee `?autoOpen=true&openUserId=&openUserRol=&openUserName=`
 * desde la query string de la ruta. Si los params son válidos, devuelve el target
 * y dispara `setSearchTerm` para que el listado paginado lo encuentre.
 * El effect del componente arma el match contra `items` y abre el dialog.
 */
export function readAutoOpenQueryParams(
	route: ActivatedRoute,
	setSearchTerm: (term: string) => void,
): AutoOpenTarget | null {
	const params = route.snapshot.queryParamMap;
	if (params.get('autoOpen') !== 'true') return null;
	const idStr = params.get('openUserId');
	const rol = params.get('openUserRol');
	const name = params.get('openUserName');
	const id = idStr ? Number(idStr) : NaN;
	if (!Number.isFinite(id) || !rol) return null;
	if (name) setSearchTerm(name);
	return { id, rol };
}

/**
 * Busca el target en la lista cargada. Devuelve null si no encuentra match
 * (caller debería esperar al próximo tick del effect).
 */
export function findAutoOpenMatch(
	target: AutoOpenTarget,
	items: readonly UsuarioLista[] | undefined,
): UsuarioLista | null {
	if (!items?.length) return null;
	return items.find((u) => u.id === target.id && u.rol === target.rol) ?? null;
}

// Re-export de tipos solo para tests del componente.
export type AutoOpenSignal = WritableSignal<AutoOpenTarget | null>;
export type ItemsSignal = Signal<readonly UsuarioLista[] | undefined>;
