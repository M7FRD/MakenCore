// src/errors/PlanError.ts
import { PlanErrorCode } from './PlanErrorCode';
import { Severity } from './Severity';

/**
 * PlanError
 * * Structured error class for the Quran Planning Engine.
 * * Replaces plain `throw new Error(string)` and `console.warn` throughout.
 *
 * Every error carries:
 *   - code     → machine-readable identifier (PlanErrorCode enum)
 *   - severity → ERROR | WARNING | INFO
 *   - message  → human-readable Arabic description
 *   - context  → key/value pairs for API consumers (locations, indices, etc.)
 *
 * Static helper:
 *   PlanError.warn() → structured console.warn for non-fatal cases
 *                      where execution continues after auto-correction.
 */
export class PlanError extends Error {

    public readonly code: PlanErrorCode;
    public readonly severity: Severity;
    public readonly context: Record<string, unknown>;

    constructor(
        code: PlanErrorCode,
        severity: Severity,
        message: string,
        context: Record<string, unknown> = {}
    ) {
        super(message);
        this.name = 'PlanError';
        this.code = code;
        this.severity = severity;
        this.context = context;
    }

    /**
     * warn()
     * * Use for non-fatal situations where the engine auto-corrects and continues.
     * * Does NOT throw — logs a structured warning to console.
     * * Keeps the warning identifiable by code without interrupting execution.
     */
    static warn(
        code: PlanErrorCode,
        message: string,
        context: Record<string, unknown> = {}
    ): void {
        console.warn(`[PlanError:${code}] ${message}`, Object.keys(context).length ? context : '');
    }
}
