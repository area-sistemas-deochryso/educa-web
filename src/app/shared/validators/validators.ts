import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'

/**
 * Validadores custom reutilizables para formularios
 */
export class AppValidators {
	/**
	 * Valida DNI peruano (8 digitos)
	 */
	static dni(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!control.value) return null

			const value = control.value.toString().trim()
			const isValid = /^\d{8}$/.test(value)

			return isValid ? null : { dni: true }
		}
	}

	/**
	 * Valida password con requisitos minimos
	 * - Minimo 6 caracteres
	 * - Al menos una letra
	 * - Al menos un numero
	 */
	static password(minLength = 6): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!control.value) return null

			const value = control.value
			const errors: ValidationErrors = {}

			if (value.length < minLength) {
				errors['minLength'] = { requiredLength: minLength, actualLength: value.length }
			}
			if (!/[a-zA-Z]/.test(value)) {
				errors['noLetter'] = true
			}
			if (!/\d/.test(value)) {
				errors['noNumber'] = true
			}

			return Object.keys(errors).length ? { password: errors } : null
		}
	}

	/**
	 * Valida password fuerte
	 * - Minimo 8 caracteres
	 * - Al menos una mayuscula
	 * - Al menos una minuscula
	 * - Al menos un numero
	 * - Al menos un caracter especial
	 */
	static strongPassword(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!control.value) return null

			const value = control.value
			const errors: ValidationErrors = {}

			if (value.length < 8) errors['minLength'] = true
			if (!/[A-Z]/.test(value)) errors['noUppercase'] = true
			if (!/[a-z]/.test(value)) errors['noLowercase'] = true
			if (!/\d/.test(value)) errors['noNumber'] = true
			if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors['noSpecial'] = true

			return Object.keys(errors).length ? { strongPassword: errors } : null
		}
	}

	/**
	 * Valida email con patron mas estricto
	 */
	static email(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!control.value) return null

			const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
			const isValid = emailPattern.test(control.value)

			return isValid ? null : { email: true }
		}
	}

	/**
	 * Valida telefono peruano (9 digitos, empieza con 9)
	 */
	static phoneNumber(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!control.value) return null

			const value = control.value.toString().trim()
			const isValid = /^9\d{8}$/.test(value)

			return isValid ? null : { phoneNumber: true }
		}
	}

	/**
	 * Valida que dos campos coincidan (para confirmar password)
	 */
	static matchFields(field1: string, field2: string): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			const value1 = control.get(field1)?.value
			const value2 = control.get(field2)?.value

			if (!value1 || !value2) return null

			return value1 === value2 ? null : { mismatch: { field1, field2 } }
		}
	}

	/**
	 * Valida campo requerido con mensaje personalizado
	 */
	static required(fieldName: string): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			const isEmpty =
				control.value === null ||
				control.value === undefined ||
				control.value === '' ||
				(typeof control.value === 'string' && !control.value.trim())

			return isEmpty ? { required: { fieldName } } : null
		}
	}

	/**
	 * Valida rango numerico
	 */
	static range(min: number, max: number): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (control.value === null || control.value === undefined) return null

			const value = Number(control.value)
			if (isNaN(value)) return { range: { min, max, actual: control.value } }

			return value >= min && value <= max ? null : { range: { min, max, actual: value } }
		}
	}

	/**
	 * Valida solo letras y espacios (para nombres)
	 */
	static onlyLetters(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!control.value) return null

			const isValid = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(control.value)
			return isValid ? null : { onlyLetters: true }
		}
	}

	/**
	 * Valida solo numeros
	 */
	static onlyNumbers(): ValidatorFn {
		return (control: AbstractControl): ValidationErrors | null => {
			if (!control.value) return null

			const isValid = /^\d+$/.test(control.value.toString())
			return isValid ? null : { onlyNumbers: true }
		}
	}
}
