// #region Implementation
/**
 * Configuración de feriados de Perú
 * Formato: 'MM-DD' para feriados fijos que se repiten cada año
 * Formato: 'YYYY-MM-DD' para feriados específicos de un año
 */

export interface Holiday {
	date: string; // 'MM-DD' o 'YYYY-MM-DD'
	name: string;
	description: string;
	type: 'national' | 'regional' | 'special';
	icon: string; // PrimeIcons class
}

export const PERU_HOLIDAYS: Holiday[] = [
	// Feriados nacionales fijos
	{
		date: '01-01',
		name: 'Año Nuevo',
		description:
			'Celebración del inicio del nuevo año. Día de reflexión y nuevos comienzos para todas las familias peruanas.',
		type: 'national',
		icon: 'pi-sparkles',
	},
	{
		date: '03-08',
		name: 'Día Internacional de la Mujer',
		description:
			'Celebramos a todas las mujeres. Día de reconocimiento a la lucha por la igualdad de derechos.',
		type: 'special',
		icon: 'pi-heart',
	},
	{
		date: '05-01',
		name: 'Día del Trabajo',
		description:
			'Conmemoración internacional de los trabajadores. Se honra la lucha por los derechos laborales y la dignidad del trabajo.',
		type: 'national',
		icon: 'pi-briefcase',
	},
	{
		date: '06-07',
		name: 'Día de la Bandera',
		description:
			'Conmemoración del Día de la Bandera del Perú. Símbolo de unidad e identidad nacional.',
		type: 'special',
		icon: 'pi-flag',
	},
	{
		date: '06-29',
		name: 'San Pedro y San Pablo',
		description:
			'Festividad religiosa en honor a los apóstoles San Pedro y San Pablo, pilares de la Iglesia Católica.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '07-06',
		name: 'Día del Maestro',
		description: 'Homenaje a todos los docentes del Perú. Reconocimiento a su labor educativa.',
		type: 'special',
		icon: 'pi-users',
	},
	{
		date: '07-23',
		name: 'Día de la Fuerza Aérea del Perú',
		description:
			'Se conmemora la creación de la Fuerza Aérea del Perú y se rinde homenaje a los héroes de la aviación nacional.',
		type: 'national',
		icon: 'pi-send',
	},
	{
		date: '07-28',
		name: 'Día de la Independencia',
		description:
			'Aniversario de la proclamación de la independencia del Perú por Don José de San Martín en 1821. Día de la Patria.',
		type: 'national',
		icon: 'pi-flag',
	},
	{
		date: '07-29',
		name: 'Día de la Independencia',
		description:
			'Segundo día de celebración patria. Gran Parada y Desfile Cívico Militar en honor a las Fuerzas Armadas.',
		type: 'national',
		icon: 'pi-flag',
	},
	{
		date: '08-06',
		name: 'Batalla de Junín',
		description:
			'Conmemoración de la victoria patriota en la Batalla de Junín (1824), preludio de la independencia sudamericana.',
		type: 'national',
		icon: 'pi-star',
	},
	{
		date: '08-30',
		name: 'Santa Rosa de Lima',
		description:
			'Festividad de Santa Rosa de Lima, primera santa de América, patrona de Lima, Perú y las Américas.',
		type: 'national',
		icon: 'pi-heart',
	},
	{
		date: '09-23',
		name: 'Día de la Primavera y del Estudiante',
		description:
			'Celebración del Día de la Primavera y la Juventud. Día dedicado a los estudiantes.',
		type: 'special',
		icon: 'pi-sun',
	},
	{
		date: '10-08',
		name: 'Combate de Angamos',
		description:
			'Homenaje al héroe Miguel Grau Seminario y la Marina de Guerra del Perú. Día de la Marina.',
		type: 'national',
		icon: 'pi-compass',
	},
	{
		date: '10-31',
		name: 'Halloween',
		description: 'Celebración de Halloween. Día de disfraces y actividades recreativas.',
		type: 'special',
		icon: 'pi-moon',
	},
	{
		date: '11-01',
		name: 'Día de Todos los Santos',
		description:
			'Día dedicado a honrar a todos los santos. Las familias visitan los cementerios para recordar a sus seres queridos.',
		type: 'national',
		icon: 'pi-star-fill',
	},
	{
		date: '12-08',
		name: 'Inmaculada Concepción',
		description:
			'Festividad católica que celebra la concepción inmaculada de la Virgen María, libre de pecado original.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '12-09',
		name: 'Batalla de Ayacucho',
		description:
			'Conmemoración de la Batalla de Ayacucho (1824), victoria decisiva que selló la independencia de Sudamérica.',
		type: 'national',
		icon: 'pi-star',
	},
	{
		date: '12-25',
		name: 'Navidad',
		description:
			'Celebración del nacimiento de Jesucristo. Día de unión familiar, intercambio de regalos y tradiciones navideñas.',
		type: 'national',
		icon: 'pi-gift',
	},

	// Feriados móviles (Semana Santa) - se deben actualizar cada año
	// 2024
	{
		date: '2024-03-28',
		name: 'Jueves Santo',
		description:
			'Conmemoración de la Última Cena de Jesús con sus apóstoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2024-03-29',
		name: 'Viernes Santo',
		description:
			'Día de recogimiento que conmemora la crucifixión y muerte de Jesucristo. Procesiones en todo el país.',
		type: 'national',
		icon: 'pi-sun',
	},
	// 2025
	{
		date: '2025-04-17',
		name: 'Jueves Santo',
		description:
			'Conmemoración de la Última Cena de Jesús con sus apóstoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2025-04-18',
		name: 'Viernes Santo',
		description:
			'Día de recogimiento que conmemora la crucifixión y muerte de Jesucristo. Procesiones en todo el país.',
		type: 'national',
		icon: 'pi-sun',
	},
	// 2026
	{
		date: '2026-04-02',
		name: 'Jueves Santo',
		description:
			'Conmemoración de la Última Cena de Jesús con sus apóstoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2026-04-03',
		name: 'Viernes Santo',
		description:
			'Día de recogimiento que conmemora la crucifixión y muerte de Jesucristo. Procesiones en todo el país.',
		type: 'national',
		icon: 'pi-sun',
	},
	// 2027
	{
		date: '2027-03-25',
		name: 'Jueves Santo',
		description:
			'Conmemoración de la Última Cena de Jesús con sus apóstoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2027-03-26',
		name: 'Viernes Santo',
		description:
			'Día de recogimiento que conmemora la crucifixión y muerte de Jesucristo. Procesiones en todo el país.',
		type: 'national',
		icon: 'pi-sun',
	},
];

/**
 * Verifica si una fecha es feriado
 */
export function isHoliday(date: Date): Holiday | null {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const year = date.getFullYear();

	// Primero buscar por fecha específica (YYYY-MM-DD)
	const specificDate = `${year}-${month}-${day}`;
	const specificHoliday = PERU_HOLIDAYS.find((h) => h.date === specificDate);
	if (specificHoliday) return specificHoliday;

	// Luego buscar por fecha fija (MM-DD)
	const fixedDate = `${month}-${day}`;
	const fixedHoliday = PERU_HOLIDAYS.find((h) => h.date === fixedDate);
	if (fixedHoliday) return fixedHoliday;

	return null;
}
// #endregion
