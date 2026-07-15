import { test, expect, type Page } from '@playwright/test';

// * Verifica que ASISTENCIA_ESTUDIANTE_DUPLICADO (brief 440, plan xrepo-87) muestre el
// mensaje curado de UI_ERROR_CODES.
//
// El código solo se dispara si el mismo estudianteId aparece dos veces en el MISMO POST
// (AsistenciaCursoService.RegistrarAsync agrupa por estudianteId y revienta si count > 1)
// — no marcando asistencia dos veces desde la UI (eso es un upsert normal). La UI de
// profesor siempre renderiza una fila por estudiante, así que no hay forma de producir
// un duplicado con clicks reales: se intercepta la request real que dispara el botón
// "Guardar Asistencia" y se duplica una entrada del array antes de que salga al backend.
// La sesión/token/cookies siguen siendo reales — solo se altera el body.

const PROFESOR_DNI = process.env.TEST_PROFESOR_DNI;
const PROFESOR_PASSWORD = process.env.TEST_PROFESOR_PASSWORD;

const DUPLICADO_MESSAGE = 'Hay un estudiante repetido en la lista de asistencia a guardar.';

async function login(page: Page): Promise<void> {
	await page.goto('/intranet/login');

	const useOtherAccount = page.getByText('Usar otra cuenta');
	if (await useOtherAccount.isVisible().catch(() => false)) {
		await useOtherAccount.click();
	}

	await page.getByPlaceholder('DNI').fill(PROFESOR_DNI!);
	await page.getByPlaceholder('Contraseña').fill(PROFESOR_PASSWORD!);

	await page.locator('app-login-role-selector p-select').click();
	await page.getByRole('option', { name: 'Profesor' }).click();

	await page.getByRole('button', { name: /Iniciar sesión|Ingresar/i }).click();
	await expect(page).toHaveURL(/\/intranet(\/|$)/, { timeout: 15_000 });
}

test.describe('ASISTENCIA_ESTUDIANTE_DUPLICADO — mensaje curado en FE', () => {
	test.skip(
		!PROFESOR_DNI || !PROFESOR_PASSWORD,
		'Requires TEST_PROFESOR_DNI and TEST_PROFESOR_PASSWORD env vars for a real profesor account with an assigned horario and enrolled students.',
	);

	test('duplicar un estudiante en el payload de registro muestra el mensaje curado', async ({
		page,
	}) => {
		await login(page);

		await page.locator('a[href="/intranet/profesor/asistencia"]').first().click();
		await expect(page).toHaveURL(/\/intranet\/profesor\/asistencia/);

		const cursoSelect = page.locator('.filters-row p-select');
		await expect(cursoSelect).toBeVisible({ timeout: 15_000 });
		await cursoSelect.click();
		await page.locator('.p-select-overlay .p-select-option').first().click();

		// La fecha ya viene precargada (hoy) — hay que buscar para cargar la lista de
		// estudiantes antes de que aparezca el botón de guardar.
		await page.getByRole('button', { name: 'Buscar asistencia' }).click();

		const guardarButton = page.getByRole('button', { name: 'Guardar Asistencia' });
		await expect(guardarButton).toBeVisible({ timeout: 10_000 });

		// Intercepta la request real: duplica el primer estudiante del lote antes de
		// dejarla continuar hacia el backend real (misma sesión/cookies/token).
		await page.route('**/AsistenciaCurso/horario/*/registrar', async (route) => {
			const request = route.request();
			const body = request.postDataJSON() as {
				fecha: string;
				asistencias: { estudianteId: number; estado: string; justificacion: string | null }[];
			};

			if (!body.asistencias?.length) {
				await route.continue();
				return;
			}

			await route.continue({
				postData: JSON.stringify({
					...body,
					asistencias: [body.asistencias[0], ...body.asistencias],
				}),
			});
		});

		await guardarButton.click();

		await expect(
			page.locator('.p-toast-detail', { hasText: DUPLICADO_MESSAGE }),
		).toBeVisible({ timeout: 10_000 });
	});
});
