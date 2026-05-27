---
description: Modo Automatizar — detectar proceso repetitivo y automatizarlo vía PowerShell $PROFILE + SendKeys.
---

# Modo: Automatizar

**Objetivo**: identificar un proceso manual repetitivo del workflow del usuario y convertirlo en automatización persistente.

## Qué hago

- Escuchar el proceso que el usuario describe como repetitivo.
- Clasificar la solución en una de dos vías (o combinación):

| Vía | Cuándo aplica | Mecanismo |
|---|---|---|
| **$PROFILE function** | El proceso ocurre al abrir una herramienta, correr un comando, o setear estado del shell. | Función en `$PROFILE` de PowerShell que wrappea el comando original. |
| **SendKeys injection** | El proceso requiere simular input de teclado dentro de una app interactiva (Claude Code slash commands, dialogs de confirmación, etc.). | `Start-Job` + `System.Windows.Forms.SendKeys::SendWait()` con delay calibrado. |

- Detectar señales del entorno (archivos en el repo, rama git, variables de entorno) para decidir qué automatizar.
- Calibrar timings de SendKeys con el usuario (empezar conservador, bajar iterativamente).
- Dejar la automatización funcional y testeada antes de cerrar.

## Qué NO hago

- Automatizar procesos que el usuario no describió como repetitivos.
- Tocar código de producto — solo archivos de configuración del shell/entorno.
- Crear scripts sueltos — preferir funciones en `$PROFILE` para que estén siempre disponibles.
- Asumir timings de SendKeys — siempre pedir al usuario que testee y ajuste.

## Herramientas clave

### PowerShell $PROFILE

Path: valor de `$PROFILE` en la terminal del usuario.

Patrón base para una función wrapper:

```powershell
function <alias> {
    # 1. Detect context (git, files, env vars)
    # 2. Build args
    # 3. Schedule SendKeys if needed (Start-Job)
    # 4. Launch the wrapped command
    <command> @args
}
```

### SendKeys

```powershell
Start-Job -ScriptBlock {
    param($text)
    Add-Type -AssemblyName System.Windows.Forms
    Start-Sleep -Milliseconds <delay>
    [System.Windows.Forms.SendKeys]::SendWait("$text{ENTER}")
} -ArgumentList $value | Out-Null
```

Consideraciones:

- **Timing**: empezar con 1500ms, bajar iterativamente. Demasiado bajo = el comando llega antes de que la app esté lista. Demasiado alto = el usuario espera innecesariamente.
- **Race con typing**: si el usuario está tipeando cuando dispara SendKeys, los caracteres se mezclan. Mitigar con delay inicial suficiente.
- **Múltiples comandos secuenciales**: encadenar con `Start-Sleep` entre cada `SendWait`. Ejemplo de auto-tune: `/model` + sleep + `/effort` + sleep + prompt de continuación.
- **Dialogs de confirmación**: algunos slash commands abren un dialog (ej: `/effort` pide "Yes/No"). Agregar `{ENTER}` extra o usar variantes que no abren dialog (ej: `/effort auto`).
- **Foco de ventana**: `SendKeys` envía al proceso con foco. Si el usuario cambia de ventana durante el delay, el input va a la ventana equivocada.

### Detección de contexto

Señales comunes para decisiones automáticas:

| Señal | Cómo detectar | Ejemplo de uso |
|---|---|---|
| Repo actual | `git rev-parse --show-toplevel` | Nombre de sesión |
| Rama actual | `git branch --show-current` | Nombre de sesión |
| Stack/tecnología | `Test-Path` de archivos señal (`*.sln`, `angular.json`, `package.json`, etc.) | Color de sesión |
| Variables de entorno | `$env:VAR` | Ambiente (dev/staging/prod) |
| Directorio actual | `$PWD` | Contexto de trabajo |

## Formato de salida

1. **Proceso identificado** — qué hace el usuario manualmente hoy.
2. **Solución propuesta** — qué vía (Profile/SendKeys/ambas), qué detecta, qué automatiza.
3. **Implementación** — código directo en `$PROFILE` o donde corresponda.
4. **Test** — pedir al usuario que pruebe y ajustar timings/lógica.

## Ejemplo real: `cc` (Claude Code auto-name + auto-color)

Proceso manual: abrir Claude Code, `/rename repo/branch`, `/color <color>`.

Solución: función `cc` en `$PROFILE` que detecta repo+rama vía git, stack vía archivos señal, abre con `--name`, e inyecta `/color` vía SendKeys a 1s.

## Override por proyecto

`<repo>/.claude/commands/automate.md` puede:

- Listar procesos repetitivos específicos del proyecto como candidatos.
- Definir señales de detección propias del repo.
- Ajustar timings base según la velocidad de carga del proyecto.
