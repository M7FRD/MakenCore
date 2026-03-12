// src/errors/Severity.ts

/**
 * Severity
 * * Classifies the impact level of a PlanError.
 *
 * ERROR   → halts execution; the plan cannot continue.
 * WARNING → non-fatal; execution may continue after auto-correction.
 * INFO    → purely informational; no corrective action needed.
 */
export enum Severity {
    ERROR = 'ERROR',
    WARNING = 'WARNING',
    INFO = 'INFO',
}
