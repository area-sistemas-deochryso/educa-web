import { test, expect, type Page } from '@playwright/test';

// * Happy-path e2e: Curso -> Horario -> Salon.
//
// Flow:
//   1. Log in as an admin/coordinator (role "Administrador").
//   2. Go to /intranet/admin/horarios, open "Nuevo Horario", pick day/time/salon/curso
//      that shouldn't conflict with existing data (Saturday afternoon slot — least likely
//      to already be occupied by regular weekday classes), save.
//   3. Assert the new horario shows up in the "Por Salón" grid for the chosen salon.
//   4. Go to /intranet/admin/salones and use the "Ver horarios de este salón" action
//      (salones-admin-table.component.html) to navigate back to /intranet/admin/horarios
//      filtered by that salon (contextSalonId) and re-confirm the horario is there.
//
// WHY not a stronger salones-page assertion: salones-admin.component.html doesn't render
// horarios inline in the main table — it only exposes a "Ver horarios de este salón" button
// that navigates to the horarios page with a salonId query param. So step 4 verifies the
// association via that navigation instead of an in-place assertion on the salones screen.

// Credentials are intentionally NOT hardcoded — provide a real test admin account via env vars.
const ADMIN_DNI = process.env.TEST_ADMIN_DNI;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

async function login(page: Page): Promise<void> {
	await page.goto('/intranet/login');

	// Stored sessions (quick-login) may be present from a previous run; force the form.
	const useOtherAccount = page.getByText('Usar otra cuenta');
	if (await useOtherAccount.isVisible().catch(() => false)) {
		await useOtherAccount.click();
	}

	await page.getByPlaceholder('DNI').fill(ADMIN_DNI!);
	await page.getByPlaceholder('Contraseña').fill(ADMIN_PASSWORD!);

	// PrimeNG p-select role selector — click to open, then choose the "Administrador" option.
	await page.locator('app-login-role-selector p-select').click();
	await page.getByRole('option', { name: 'Administrador' }).click();

	await page.getByRole('button', { name: /Iniciar sesión|Ingresar/i }).click();
	await expect(page).toHaveURL(/\/intranet\/admin/, { timeout: 15_000 });
}

test.describe('Curso -> Horario -> Salon (happy path)', () => {
	test.skip(
		!ADMIN_DNI || !ADMIN_PASSWORD,
		'Requires TEST_ADMIN_DNI and TEST_ADMIN_PASSWORD env vars for a real admin account.',
	);

	test('crea un horario para un curso y salon, y se refleja al navegar desde Salones', async ({
		page,
	}) => {
		await login(page);

		// #region Step 1: create horario
		await page.goto('/intranet/admin/horarios');
		await expect(page.getByRole('button', { name: 'Nuevo Horario' })).toBeVisible();
		await page.getByRole('button', { name: 'Nuevo Horario' }).click();

		const dialog = page.getByRole('dialog').filter({ hasText: 'Crear Horario' });
		await expect(dialog).toBeVisible();

		// Sabado tarde: slot poco usado por clases regulares de semana, para minimizar
		// conflicto de horario con datos ya sembrados.
		await dialog.locator('#diaSemana').click();
		await page.getByRole('option', { name: 'Sábado' }).click();
		await dialog.locator('#horaInicio').fill('15:00');
		await dialog.locator('#horaFin').fill('16:00');

		// Salon: open the filterable p-select and take the first available option.
		await dialog.locator('#salon').click();
		const salonOption = page.locator('.p-select-overlay .p-select-option').first();
		await expect(salonOption).toBeVisible();
		const salonLabel = (await salonOption.locator('.font-semibold').textContent())?.trim();
		await salonOption.click();

		// Curso: opens the level-tabbed picker modal, pick the first course of "Primaria".
		await dialog.getByRole('button', { name: /Seleccionar curso/i }).click();
		const cursoDialog = page.getByRole('dialog').filter({ hasText: 'Seleccionar Curso por Nivel Educativo' });
		await expect(cursoDialog).toBeVisible();
		await cursoDialog.getByRole('tab', { name: /Primaria/i }).click();
		await cursoDialog.locator('.curso-card').first().click();
		await cursoDialog.getByRole('button', { name: 'Confirmar' }).click();

		await dialog.getByRole('button', { name: 'Crear' }).click();
		await expect(dialog).toBeHidden();
		// #endregion

		// #region Step 2: verify it shows up in the "Por Salón" grid
		await page.getByRole('button', { name: 'Por Salón' }).click();
		await expect(page.getByText(salonLabel!).first()).toBeVisible();
		// The newly-created block for Sabado 15:00-16:00 should render somewhere in the grid.
		await expect(page.getByText('15:00', { exact: false }).first()).toBeVisible();
		// #endregion

		// #region Step 3: from Salones, navigate to the horarios filtered by that salon
		await page.goto('/intranet/admin/salones');
		const salonRow = page.locator('table tr', { hasText: salonLabel ?? '' }).first();
		await salonRow.getByRole('button', { name: 'Ver horarios de este salón' }).click();

		await expect(page).toHaveURL(/\/intranet\/admin\/horarios\?salonId=/);
		await expect(page.getByText('15:00', { exact: false }).first()).toBeVisible();
		// #endregion
	});
});
