# 293 — P45 F3 FE: Interceptor capture + breadcrumb instrumentation

> **Created**: 2026-06-02
> **Plan**: [xrepo-45](../../../../../educa-coord/plans/xrepo-45-monitoreo-incidencias-rework.md) §F3
> **Phase**: F3 — FE interceptor complete column capture
> **Repo**: educa-web
> **Depends on**: brief 288 (P45 F2.2 FE ✅) + P45 F5 BE ✅ (ProblemDetails already shipped)
> **Mode**: `/investigate` → `/execute` → `/validate`
> **Validación prod**: ⏳ pendiente desde 2026-06-03

---

## Objective

Fill the NULL columns in error log entries. The interceptor currently captures errors but does not serialize:
- Request body for mutation requests (sanitized)
- Response body from backend
- Consistent source location

Also instrument click and form-submit breadcrumb types via opt-in directives at critical interaction points.

## Pre-work

- Read `error.interceptor.ts` and `ErrorReporterService`
- Read ProblemDetails response shape (ADR-0005) for normalization adapter
- Read existing breadcrumb schema and tracker service

## Validation

- lint + tsc clean
- Browser test: trigger an error, verify request body, response body, and source location captured
- Verify breadcrumb entries appear for instrumented click/form-submit points
