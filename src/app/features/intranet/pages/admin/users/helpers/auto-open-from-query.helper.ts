import { ActivatedRoute } from '@angular/router';
import { Signal, WritableSignal } from '@angular/core';

import type { UsuarioLista } from '../services';

export type AutoOpenTarget =
	| { kind: 'id'; id: number; rol: string }
	| { kind: 'dni'; dni: string };

/**
 * Lee la query string de la ruta y devuelve el target a auto-abrir, o null.
 *
 * Soporta dos contratos:
 *
 * 1. Rama DNI (humano-friendly, F-021): `?dni=X[&autoOpen=true]`.
 *    Siempre filtra el listado por DNI; solo arma target si `autoOpen=true`.
 * 2. Rama legacy (auditoría → usuarios): `?autoOpen=true&openUserId=&openUserRol=&openUserName=`.
 *    Requiere `autoOpen=true` + `openUserId` + `openUserRol`. `openUserName` filtra el listado.
 *
 * El effect del componente espera a que la lista cargue, busca el match con
 * `findAutoOpenMatch` y abre el dialog. La rama DNI exige un match único.
 */
export function readAutoOpenQueryParams(
	route: ActivatedRoute,
	setSearchTerm: (term: string) => void,
): AutoOpenTarget | null {
	const params = route.snapshot.queryParamMap;
	const autoOpen = params.get('autoOpen') === 'true';

	const dni = params.get('dni');
	if (dni) {
		setSearchTerm(dni);
		return autoOpen ? { kind: 'dni', dni } : null;
	}

	if (!autoOpen) return null;
	const idStr = params.get('openUserId');
	const rol = params.get('openUserRol');
	const name = params.get('openUserName');
	const id = idStr ? Number(idStr) : NaN;
	if (!Number.isFinite(id) || !rol) return null;
	if (name) setSearchTerm(name);
	return { kind: 'id', id, rol };
}

/**
 * Busca el target en la lista cargada. Devuelve null si no encuentra match
 * (caller debería esperar al próximo tick del effect).
 *
 * Para `kind: 'dni'`, exige un único match exacto. 0 o 2+ matches devuelven
 * null (DNI debería ser único, pero defendemos contra duplicados accidentales).
 */
export function findAutoOpenMatch(
	target: AutoOpenTarget,
	items: readonly UsuarioLista[] | undefined,
): UsuarioLista | null {
	if (!items?.length) return null;
	if (target.kind === 'id') {
		return items.find((u) => u.id === target.id && u.rol === target.rol) ?? null;
	}
	const matches = items.filter((u) => u.dni === target.dni);
	return matches.length === 1 ? matches[0] : null;
}

// Re-export de tipos solo para tests del componente.
export type AutoOpenSignal = WritableSignal<AutoOpenTarget | null>;
export type ItemsSignal = Signal<readonly UsuarioLista[] | undefined>;
