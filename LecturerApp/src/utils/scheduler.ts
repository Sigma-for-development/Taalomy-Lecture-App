export interface ScheduleItem {
    id: number;
    type: 'class' | 'group';
    name: string;
    days_of_week?: string;
    start_time?: string;
    end_time?: string;
}

interface NewSchedule {
    days_of_week: string[];
    start_time: string; // HH:MM:SS or HH:MM
    end_time: string;   // HH:MM:SS or HH:MM
}

export const checkForConflicts = (
    newSchedule: NewSchedule,
    existingItems: ScheduleItem[],
    currentId: number,
    currentType: 'class' | 'group'
): { hasConflict: boolean; conflictingItem?: ScheduleItem } => {
    // Helper to convert time string to minutes from midnight
    const toMinutes = (timeStr: string) => {
        if (!timeStr) return -1;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const newStart = toMinutes(newSchedule.start_time);
    const newEnd = toMinutes(newSchedule.end_time);

    if (newStart === -1 || newEnd === -1) return { hasConflict: false };

    for (const item of existingItems) {
        // Skip self
        if (item.id === currentId && item.type === currentType) continue;

        // Skip if no schedule
        if (!item.days_of_week || !item.start_time || !item.end_time) continue;

        // Check for day overlap
        const itemDays = item.days_of_week.split(',').map(d => d.trim().toLowerCase());
        const newDays = newSchedule.days_of_week.map(d => d.trim().toLowerCase());

        const hasDayOverlap = newDays.some(day => itemDays.includes(day));
        if (!hasDayOverlap) continue;

        // Check for time overlap
        const itemStart = toMinutes(item.start_time);
        const itemEnd = toMinutes(item.end_time);

        // Overlap logic: (StartA < EndB) and (StartB < EndA)
        if (newStart < itemEnd && itemStart < newEnd) {
            return { hasConflict: true, conflictingItem: item };
        }
    }

    return { hasConflict: false };
};
