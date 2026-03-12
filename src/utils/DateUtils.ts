/**
 * Date manipulation utilities.
 */
export class DateUtils {
    /**
     * Adds days to a date (immutable).
     */
    static addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Formats date as YYYY-MM-DD.
     */
    static formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Checks if date is a working day.
     * @param daysPerWeek - Working days from Sunday (0=Sun, 6=Sat)
     * 
     * EXAMPLE: daysPerWeek=5 means Sun-Thu are working days
     */
    static isWorkingDay(date: Date, daysPerWeek: number): boolean {
        const dayIndex = date.getDay(); // 0=Sunday
        return dayIndex < daysPerWeek;
    }
}