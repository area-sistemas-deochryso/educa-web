# Modo: Diseñar

Decidir qué construir y cómo. Sin escribir código de implementación.

## Reglas del modo

- **SÍ**: Proponer estructura, listar archivos a crear/modificar, identificar invariantes (INV-*), crear/actualizar plan o task
- **NO**: Escribir código de implementación, crear archivos de código, ejecutar lint/build/test, asumir decisiones sin validar

## Al iniciar

1. Confirmar el objetivo del cambio
2. Identificar qué invariantes y reglas de negocio aplican
3. Proponer estructura con archivos, decisiones de arquitectura y dependencias
4. Validar con el usuario antes de considerar cerrado

## Entregable

Plan concreto: archivos a tocar, decisiones tomadas, dependencias, estimado de chats de ejecución.

## Regla clave

Este modo es **obligatorio** antes de Ejecutar cuando la tarea toca 3+ archivos o implica decisiones de arquitectura. Si el usuario pide ejecutar directamente algo complejo, sugerir diseñar primero.
