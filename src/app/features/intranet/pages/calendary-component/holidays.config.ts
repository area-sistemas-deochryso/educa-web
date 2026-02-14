// #region Implementation
/**
 * ConfiguraciÃ³n de feriados de PerÃº
 * Formato: 'MM-DD' para feriados fijos que se repiten cada aÃ±o
 * Formato: 'YYYY-MM-DD' para feriados especÃ­ficos de un aÃ±o
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
		name: 'AÃ±o Nuevo',
		description:
			'CelebraciÃ³n del inicio del nuevo aÃ±o. DÃ­a de reflexiÃ³n y nuevos comienzos para todas las familias peruanas.',
		type: 'national',
		icon: 'pi-sparkles',
	},
	{
		date: '03-08',
		name: 'DÃ­a Internacional de la Mujer',
		description:
			'Celebramos a todas las mujeres. DÃ­a de reconocimiento a la lucha por la igualdad de derechos.',
		type: 'special',
		icon: 'pi-heart',
	},
	{
		date: '05-01',
		name: 'DÃ­a del Trabajo',
		description:
			'ConmemoraciÃ³n internacional de los trabajadores. Se honra la lucha por los derechos laborales y la dignidad del trabajo.',
		type: 'national',
		icon: 'pi-briefcase',
	},
	{
		date: '06-07',
		name: 'DÃ­a de la Bandera',
		description:
			'ConmemoraciÃ³n del DÃ­a de la Bandera del PerÃº. SÃ­mbolo de unidad e identidad nacional.',
		type: 'special',
		icon: 'pi-flag',
	},
	{
		date: '06-29',
		name: 'San Pedro y San Pablo',
		description:
			'Festividad religiosa en honor a los apÃ³stoles San Pedro y San Pablo, pilares de la Iglesia CatÃ³lica.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '07-06',
		name: 'DÃ­a del Maestro',
		description: 'Homenaje a todos los docentes del PerÃº. Reconocimiento a su labor educativa.',
		type: 'special',
		icon: 'pi-users',
	},
	{
		date: '07-23',
		name: 'DÃ­a de la Fuerza AÃ©rea del PerÃº',
		description:
			'Se conmemora la creaciÃ³n de la Fuerza AÃ©rea del PerÃº y se rinde homenaje a los hÃ©roes de la aviaciÃ³n nacional.',
		type: 'national',
		icon: 'pi-send',
	},
	{
		date: '07-28',
		name: 'DÃ­a de la Independencia',
		description:
			'Aniversario de la proclamaciÃ³n de la independencia del PerÃº por Don JosÃ© de San MartÃ­n en 1821. DÃ­a de la Patria.',
		type: 'national',
		icon: 'pi-flag',
	},
	{
		date: '07-29',
		name: 'DÃ­a de la Independencia',
		description:
			'Segundo dÃ­a de celebraciÃ³n patria. Gran Parada y Desfile CÃ­vico Militar en honor a las Fuerzas Armadas.',
		type: 'national',
		icon: 'pi-flag',
	},
	{
		date: '08-06',
		name: 'Batalla de JunÃ­n',
		description:
			'ConmemoraciÃ³n de la victoria patriota en la Batalla de JunÃ­n (1824), preludio de la independencia sudamericana.',
		type: 'national',
		icon: 'pi-star',
	},
	{
		date: '08-30',
		name: 'Santa Rosa de Lima',
		description:
			'Festividad de Santa Rosa de Lima, primera santa de AmÃ©rica, patrona de Lima, PerÃº y las AmÃ©ricas.',
		type: 'national',
		icon: 'pi-heart',
	},
	{
		date: '09-23',
		name: 'DÃ­a de la Primavera y del Estudiante',
		description:
			'CelebraciÃ³n del DÃ­a de la Primavera y la Juventud. DÃ­a dedicado a los estudiantes.',
		type: 'special',
		icon: 'pi-sun',
	},
	{
		date: '10-08',
		name: 'Combate de Angamos',
		description:
			'Homenaje al hÃ©roe Miguel Grau Seminario y la Marina de Guerra del PerÃº. DÃ­a de la Marina.',
		type: 'national',
		icon: 'pi-compass',
	},
	{
		date: '10-31',
		name: 'Halloween',
		description: 'CelebraciÃ³n de Halloween. DÃ­a de disfraces y actividades recreativas.',
		type: 'special',
		icon: 'pi-moon',
	},
	{
		date: '11-01',
		name: 'DÃ­a de Todos los Santos',
		description:
			'DÃ­a dedicado a honrar a todos los santos. Las familias visitan los cementerios para recordar a sus seres queridos.',
		type: 'national',
		icon: 'pi-star-fill',
	},
	{
		date: '12-08',
		name: 'Inmaculada ConcepciÃ³n',
		description:
			'Festividad catÃ³lica que celebra la concepciÃ³n inmaculada de la Virgen MarÃ­a, libre de pecado original.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '12-09',
		name: 'Batalla de Ayacucho',
		description:
			'ConmemoraciÃ³n de la Batalla de Ayacucho (1824), victoria decisiva que sellÃ³ la independencia de SudamÃ©rica.',
		type: 'national',
		icon: 'pi-star',
	},
	{
		date: '12-25',
		name: 'Navidad',
		description:
			'CelebraciÃ³n del nacimiento de Jesucristo. DÃ­a de uniÃ³n familiar, intercambio de regalos y tradiciones navideÃ±as.',
		type: 'national',
		icon: 'pi-gift',
	},

	// Feriados mÃ³viles (Semana Santa) - se deben actualizar cada aÃ±o
	// 2024
	{
		date: '2024-03-28',
		name: 'Jueves Santo',
		description:
			'ConmemoraciÃ³n de la Ãšltima Cena de JesÃºs con sus apÃ³stoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2024-03-29',
		name: 'Viernes Santo',
		description:
			'DÃ­a de recogimiento que conmemora la crucifixiÃ³n y muerte de Jesucristo. Procesiones en todo el paÃ­s.',
		type: 'national',
		icon: 'pi-sun',
	},
	// 2025
	{
		date: '2025-04-17',
		name: 'Jueves Santo',
		description:
			'ConmemoraciÃ³n de la Ãšltima Cena de JesÃºs con sus apÃ³stoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2025-04-18',
		name: 'Viernes Santo',
		description:
			'DÃ­a de recogimiento que conmemora la crucifixiÃ³n y muerte de Jesucristo. Procesiones en todo el paÃ­s.',
		type: 'national',
		icon: 'pi-sun',
	},
	// 2026
	{
		date: '2026-04-02',
		name: 'Jueves Santo',
		description:
			'ConmemoraciÃ³n de la Ãšltima Cena de JesÃºs con sus apÃ³stoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2026-04-03',
		name: 'Viernes Santo',
		description:
			'DÃ­a de recogimiento que conmemora la crucifixiÃ³n y muerte de Jesucristo. Procesiones en todo el paÃ­s.',
		type: 'national',
		icon: 'pi-sun',
	},
	// 2027
	{
		date: '2027-03-25',
		name: 'Jueves Santo',
		description:
			'ConmemoraciÃ³n de la Ãšltima Cena de JesÃºs con sus apÃ³stoles. Inicio del Triduo Pascual.',
		type: 'national',
		icon: 'pi-sun',
	},
	{
		date: '2027-03-26',
		name: 'Viernes Santo',
		description:
			'DÃ­a de recogimiento que conmemora la crucifixiÃ³n y muerte de Jesucristo. Procesiones en todo el paÃ­s.',
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

	// Primero buscar por fecha especÃ­fica (YYYY-MM-DD)
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
