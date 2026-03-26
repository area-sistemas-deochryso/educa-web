# Optimización de Lectura de Archivos

> **"Solo leer lo estrictamente necesario. Necesidad sobre curiosidad."**

## Reglas

- **SÍ leer**: Archivos que vas a modificar, archivos con el error/bug, contexto crítico imposible de inferir
- **NO leer**: Para explorar, por si acaso, múltiples archivos similares, archivos completos cuando Grep/Glob basta
- **Buscar antes de leer**: Grep/Glob primero → Read solo el archivo confirmado
- **Confiar en convenciones**: Si la arquitectura dice dónde va algo, crear directo sin leer ejemplos

## Verificación antes de cada Read

- [ ] ¿Voy a editar este archivo?
- [ ] ¿Contiene el error específico?
- [ ] ¿Es imposible sin este contexto?
- [ ] ¿Puedo inferirlo por convenciones? → NO leer

**Excepción**: Cuando el usuario pide explícitamente explorar/investigar.
