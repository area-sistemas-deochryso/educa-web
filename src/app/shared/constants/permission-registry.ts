// Capability codes and route mapping now come from the API (brief 336).
// This file is kept for the CapabilityCode re-export only.
// The PERMISOS constant, CAPABILITY_TO_ROUTE, ROUTE_TO_CAPABILITY, and ALL_PERMISOS
// have been removed — routes are served by GET /api/auth/capabilities.

export type { CapabilityCode } from '@shared/types';
