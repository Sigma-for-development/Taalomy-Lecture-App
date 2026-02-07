/**
 * Formats a date string into a Gregorian date string (e.g., "Jan 1, 2025")
 * Forces en-US locale and gregory calendar to ensure consistency regardless of device settings.
 */
export const formatGregorianDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Formats a date string into a Gregorian date and time string (e.g., "Jan 1, 2025, 10:30 AM")
 */
export const formatGregorianDateTime = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};
