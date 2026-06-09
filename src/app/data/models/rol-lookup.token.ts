import { type Rol } from './rol.models';

export interface RolLookup {
	byNombre(nombre: string): Rol | undefined;
}

let _ref: RolLookup | null = null;

export function registerRolLookup(ref: RolLookup): void {
	_ref = ref;
}

export function getRolLookup(): RolLookup | null {
	return _ref;
}
