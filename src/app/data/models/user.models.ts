export interface User {
	id: number;
	dni: string;
	nombreCompleto: string;
	email?: string;
	telefono?: string;
	rol: string;
	activo: boolean;
	fechaCreacion?: string;
}

export interface CreateUserDto {
	dni: string;
	nombreCompleto: string;
	email?: string;
	telefono?: string;
	rol: string;
	password: string;
}

export interface UpdateUserDto {
	nombreCompleto?: string;
	email?: string;
	telefono?: string;
	activo?: boolean;
}
