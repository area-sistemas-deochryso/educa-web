import { test, expect, type Page } from '@playwright/test';

// * Verifica que SALON_DUPLICADO (brief 440, plan xrepo-87) muestre el mensaje curado
// de UI_ERROR_CODES cuando se crea un salón con la misma combinación grado+sección+
// sede+año que uno ya existente. La duplicidad es por esa combinación, no por un
// campo "nombre" (el dialog no lo tiene) — ver SalonesService.CrearAsync (BE).

const ADMIN_DNI = process.env.TEST_ADMIN_DNI;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

const DUPLICADO_MESSAGE = 'Ya existe un salón con ese nombre.';
// Año poco usual para minimizar la chance de chocar con datos reales sembrados a propósito
// por otra corrida — el propio test crea el primer salón con esta combinación.
const ANIO_TEST = 2029;

async function login(page: Page): Promise<void> {
	await page.goto('/intranet/login');

	const useOtherAccount = page.getByText('Usar otra cuenta');
	if (await useOtherAccount.isVisible().catch(() => false)) {
		await useOtherAccount.click();
	}

	await page.getByPlaceholder('DNI').fill(ADMIN_DNI!);
	await page.getByPlaceholder('Contraseña').fill(ADMIN_PASSWORD!);

	await page.locator('app-login-role-selector p-select').click();
	await page.getByRole('option', { name: 'Administrador' }).click();

	await page.getByRole('button', { name: /Iniciar sesión|Ingresar/i }).click();
	await expect(page).toHaveURL(/\/intranet(\/|$)/, { timeout: 15_000 });
}

async function crearSalon(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Nuevo Salón' }).click();

	const dialog = page.getByRole('dialog').filter({ hasText: 'Nuevo Salón' });
	await expect(dialog).toBeVisible();

	await dialog.locator('#nuevoSalonGrado').click();
	await page.locator('.p-select-overlay .p-select-option').first().click();

	await dialog.locator('#nuevoSalonSeccion').click();
	await page.locator('.p-select-overlay .p-select-option').first().click();

	await dialog.locator('#nuevoSalonSede').click();
	await page.locator('.p-select-overlay .p-select-option').first().click();

	await dialog.locator('#nuevoSalonAnio input').fill(String(ANIO_TEST));

	const crearButton = dialog.getByRole('button', { name: 'Crear' });
	await expect(crearButton).toBeEnabled({ timeout: 10_000 });
	await crearButton.click();
}

test.describe('SALON_DUPLICADO — mensaje curado en FE', () => {
	test.skip(
		!ADMIN_DNI || !ADMIN_PASSWORD,
		'Requires TEST_ADMIN_DNI and TEST_ADMIN_PASSWORD env vars for a real admin account.',
	);

	test('crear el mismo salón (grado+sección+sede+año) dos veces muestra el mensaje de duplicado curado', async ({
		page,
	}) => {
		await login(page);
		// La quick-access de dashboard no incluye un link directo a Salones — entramos al
		// módulo académico vía Horarios (sí presente) y de ahí usamos el nav "Administración".
		await page.locator('a[href="/intranet/admin/horarios"]').first().click();
		await expect(page).toHaveURL(/\/intranet\/admin\/horarios/);
		await page.getByRole('button', { name: 'Administración', exact: false }).click();
		await page.locator('a[href="/intranet/admin/salones"]').first().click();
		await expect(page).toHaveURL(/\/intranet\/admin\/salones/);
		await expect(page.getByRole('button', { name: 'Nuevo Salón' })).toBeVisible();

		// Primer intento: puede tener éxito o, si ya existe de una corrida previa,
		// disparar directamente el error de duplicado que buscamos verificar.
		await crearSalon(page);

		const dialog = page.getByRole('dialog').filter({ hasText: 'Nuevo Salón' });
		const toastDuplicado = page.locator('.p-toast-detail', { hasText: DUPLICADO_MESSAGE });

		// Carrera entre "dialog cerrado" (éxito) y "toast de duplicado" (error) — esperar
		// secuencialmente el cierre del dialog con un timeout largo desperdicia la vida
		// del toast (5s) cuando el error llega primero.
		const outcome = await Promise.race([
			dialog.waitFor({ state: 'hidden', timeout: 8_000 }).then(() => 'closed' as const),
			toastDuplicado.waitFor({ state: 'visible', timeout: 8_000 }).then(() => 'duplicado' as const),
		]).catch(() => 'timeout' as const);

		if (outcome === 'closed') {
			// Se creó con éxito — repetir la misma combinación para forzar el duplicado.
			await crearSalon(page);
		}

		await expect(toastDuplicado).toBeVisible({ timeout: 10_000 });
	});
});
