import axios from 'axios';
import { lecturerAPI } from './api';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_LECTURER_PERSONAL_API;
const GROQ_MODEL = "openai/gpt-oss-20b"; // User specified model

export interface AIChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const aiService = {
    async getLecturerContext() {
        try {
            const [profile, stats, classes, groups, bookings] = await Promise.all([
                lecturerAPI.getUserProfile().catch(() => ({ data: {} })),
                lecturerAPI.getDashboardStats().catch(() => ({ data: {} })),
                lecturerAPI.getClasses().catch(() => ({ data: [] })),
                lecturerAPI.getGroups().catch(() => ({ data: [] })),
                lecturerAPI.getBookings().catch(() => ({ data: [] })),
            ]);

            const context = {
                lecturerName: `${profile.data.first_name || ''} ${profile.data.last_name || ''}`.trim(),
                totalStudents: stats.data.total_students || 0,
                pendingGrades: stats.data.pending_grades || 0,
                classesToday: stats.data.classes_today || 0,
                classes: (classes.data || []).map((c: any) => ({
                    name: c.name,
                    venue: c.venue,
                    days: c.days_of_week,
                    startTime: c.start_time,
                    endTime: c.end_time
                })),
                groups: (groups.data || []).map((g: any) => ({
                    name: g.name,
                    venue: g.venue,
                    days: g.days_of_week,
                    startTime: g.start_time,
                    endTime: g.end_time
                })),
                pendingBookings: (bookings.data || []).filter((b: any) => b.status === 'pending').map((b: any) => ({
                    student: b.student_name,
                    subject: b.subject,
                    date: b.booking_date,
                    time: `${b.start_time} - ${b.end_time}`
                }))
            };

            return JSON.stringify(context, null, 2);
        } catch (error) {
            console.error('Error gathering AI context:', error);
            return "Context unavailable";
        }
    },

    async getChatResponse(messages: AIChatMessage[]) {
        if (!GROQ_API_KEY) {
            return "API Key missing. Please check your .env file.";
        }

        try {
            const context = await this.getLecturerContext();
            const systemPrompt = `You are a personal AI assistant for a lecturer on the Taalomy platform. 
      Your goal is to help the lecturer manage their academic life.
      
      HERE IS THE LECTURER'S CURRENT CONTEXT:
      ${context}
      
      Current Date/Time: ${new Date().toLocaleString()}
      
      Instructions:
      1. Use the provided context to answer questions about specific classes, students, or bookings.
      2. If asked about today's schedule, filter context by today's day of the week.
      3. **FORMATTING: ACHIEVE A "BEST-IN-CLASS" MINIMALIST LOOK.**
      4. Avoid dense bullet lists. Use a clean "Dashboard-style" layout with bold section headers and line breaks.
      5. **BANNED**: Do not say "no duration provided" or "Online (Zoom)". Just say the platform name if it's there.
      6. Example Layout:
         ### 📍 **Class Name**
         **16:15** | Zoom
         • Sunday, Tuesday
         
         ---
         
      7. Use "---" lines strictly between different items to create horizontal separation.
      8. Be professional, helpful, and ultra-concise. Speak as a premium AI companion.`;

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: GROQ_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ],
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error: any) {
            console.error('Groq API Error:', error?.response?.data || error.message);

            // Fallback if the user's specific model fails (common if it's not actually on Groq)
            if (error?.response?.status === 404 || error?.response?.status === 400) {
                try {
                    const fallbackResponse = await axios.post(
                        'https://api.groq.com/openai/v1/chat/completions',
                        {
                            model: "llama3-70b-8192", // Reliable fallback on Groq
                            messages: messages,
                            temperature: 0.7,
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${GROQ_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                    return fallbackResponse.data.choices[0].message.content.trim();
                } catch (innerError) {
                    return "I'm having trouble connecting to my brain right now. Please try again later.";
                }
            }

            return "I encountered an error processing your request.";
        }
    }
};
