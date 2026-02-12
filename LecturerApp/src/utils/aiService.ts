import axios from 'axios';
import api from '../config/api';
import { aiContextCache } from './aiContextCache';
import { Platform } from 'react-native';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_LECTURER_PERSONAL_API;
const GROQ_BACKUP_KEY = process.env.EXPO_PUBLIC_GROQ_BACKUP_API;
const GROQ_MODEL = "openai/gpt-oss-20b"; // User specified model
const GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile";

/**
 * Helper: Make a Groq API call with a given key and model.
 */
async function callGroqApi(apiKey: string, model: string, messages: AIChatMessage[], temperature: number = 0.7) {
    return axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model, messages, temperature },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        }
    );
}

export interface AIChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const aiService = {
    async fetchSessions(): Promise<any[]> {
        try {
            const response = await api.get('ai-assistant/sessions/');
            return response.data;
        } catch (error) {
            console.error('Error fetching AI sessions:', error);
            return [];
        }
    },

    async createSession(title: string = "New Chat"): Promise<any> {
        try {
            const response = await api.post('ai-assistant/sessions/', { title });
            return response.data;
        } catch (error) {
            console.error('Error creating AI session:', error);
            return null;
        }
    },

    async deleteSession(sessionId: number) {
        try {
            await api.delete(`ai-assistant/sessions/${sessionId}/`);
        } catch (error) {
            console.error('Error deleting AI session:', error);
        }
    },

    async fetchHistory(sessionId: number | null): Promise<AIChatMessage[]> {
        if (!sessionId) return [];
        try {
            const response = await api.get('ai-assistant/messages/', {
                params: { session_id: sessionId }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching AI history:', error);
            return [];
        }
    },

    async fetchGlobalHistory(): Promise<any[]> {
        try {
            const response = await api.get('ai-assistant/global-history/');
            return response.data;
        } catch (error) {
            console.error('Error fetching global AI history:', error);
            return [];
        }
    },

    async fetchUsage(): Promise<{ used: number, limit: number, reset_time: string } | null> {
        try {
            const response = await api.get('ai-assistant/usage/');
            return response.data;
        } catch (error) {
            console.error('Error fetching AI usage:', error);
            return null;
        }
    },

    async fetchMasterContext(): Promise<any | null> {
        try {
            const response = await api.get('ai-assistant/master-context/');
            return response.data;
        } catch (error) {
            console.error('Error fetching AI Master Context:', error);
            return null;
        }
    },

    async saveMessage(sessionId: number | null, role: 'user' | 'assistant', content: string): Promise<any> {
        if (!sessionId) return null;
        try {
            const response = await api.post('ai-assistant/messages/', { session: sessionId, role, content });
            return response.data;
        } catch (error) {
            console.error('Error saving AI message:', error);
            return null;
        }
    },

    async sendMessage(studentId: number, content: string): Promise<boolean> {
        try {
            await api.post('ai-assistant/send-message/', { student_id: studentId, content });
            return true;
        } catch (error) {
            console.error('Error sending message via AI:', error);
            return false;
        }
    },

    async setupIntake(setupData: any): Promise<boolean> {
        try {
            await api.post('ai-assistant/intake-setup/', setupData);
            return true;
        } catch (error) {
            console.error('Error setting up intake via AI:', error);
            return false;
        }
    },

    async deleteIntake(intakeId: number, confirmationText: string = "I understand that this deletion can not be reversed"): Promise<boolean> {
        try {
            await api.delete(`lecturer/intakes/${intakeId}/`, {
                data: { confirmation: confirmationText }
            });
            return true;
        } catch (error) {
            console.error('Error deleting intake via AI:', error);
            return false;
        }
    },

    async updateMessageStatus(msgId: string | number, status: string): Promise<boolean> {
        try {
            await api.patch(`ai-assistant/messages/${msgId}/`, { action_status: status });
            return true;
        } catch (error) {
            console.error('Error updating AI message status:', error);
            return false;
        }
    },

    async parsePDF(fileUri: string): Promise<string> {
        try {
            const formData = new FormData();

            if (Platform.OS === 'web') {
                const response = await fetch(fileUri);
                const blob = await response.blob();
                formData.append('file', blob, 'document.pdf');
            } else {
                // @ts-ignore
                formData.append('file', {
                    uri: fileUri,
                    name: 'document.pdf',
                    type: 'application/pdf',
                });
            }

            const response = await api.post('ai-assistant/parse-pdf/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data.text;
        } catch (error) {
            console.error('Error parsing PDF:', error);
            return "";
        }
    },

    async getLecturerContext() {
        // ... (existing context logic remains the same)
        try {
            const cache = await aiContextCache.getContext();
            const context = {
                lecturerName: `${cache.profile?.first_name || ''} ${cache.profile?.last_name || ''}`.trim(),
                stats: cache.stats || {},
                wallet: cache.wallet || { balance: 0 },
                recentTransactions: (cache.transactions || []).slice(0, 5),
                classes: (cache.classes || []).map((c: any) => ({
                    name: c.name,
                    type: c.type,
                    venue: c.venue,
                    days: c.days_of_week,
                    startTime: c.start_time,
                    endTime: c.end_time
                })),
                pendingBookings: (cache.bookings || []).filter((b: any) => b.status === 'pending').map((b: any) => ({
                    student: b.student_name,
                    subject: b.subject,
                    date: b.booking_date,
                    time: `${b.start_time} - ${b.end_time}`
                })),
                lastDataUpdate: cache.lastUpdated
            };
            return JSON.stringify(context, null, 2);
        } catch (error) {
            console.error('Error gathering AI context:', error);
            return "Context unavailable";
        }
    },

    async getChatResponse(sessionId: number | null, messages: AIChatMessage[], pdfContent: string = "") {
        if (!GROQ_API_KEY && !GROQ_BACKUP_KEY) {
            return { text: "API Key missing. Please check your .env file." };
        }

        // Save the latest user message to history
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage && lastUserMessage.role === 'user' && sessionId) {
            const saved = await this.saveMessage(sessionId, 'user', lastUserMessage.content);
            if (!saved) {
                return { text: "You have reached your daily limit of 50 messages. Please try again tomorrow." };
            }
        }

        try {
            const masterContext = await this.fetchMasterContext();
            const systemPrompt = `You are a personal AI assistant for a lecturer on the Taalomy platform. 
      Your goal is to help the lecturer manage their academic life.
      
      HERE IS THE LECTURER'S CURRENT CONTEXT (LIVE DASHBOARD DATA):
      ${masterContext ? JSON.stringify(masterContext, null, 2) : "Context unavailable"}
      
      Current Date/Time: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })} 
      (Note: It is currently 2026, and you must strictly use the Gregorian calendar for all dates and schedules.)
 
      ### 🧠 SHARED MEMORY (PAST INTERACTIONS)
(The following are snippets from previous chats with the lecturer. Use this context if the current query relates to something mentioned before.)
${(await this.fetchGlobalHistory())
                    .filter(m => m.session !== sessionId) // Don't duplicate current session history
                    .map(m => `[Session: ${m.session_title}] ${m.role === 'user' ? 'Lecturer' : 'AI'}: ${m.content}`)
                    .join('\n')}
      
      ${pdfContent ? `### 📄 ATTACHED DOCUMENT CONTENT:
${pdfContent}
(CRITICAL: The lecturer has attached a PDF. Prioritize using the specific information in this document to answer queries. If the query is related to the document, do not rely on general knowledge or schedule context unless necessary.)` : ''}

      Instructions:
      1. Use the provided context to answer questions about specific classes, students, or bookings.
      2. **STUDENT SEARCH & ID MAPPING (CRITICAL)**: When asked to message a student, match the name against the "students" list or "upcoming_bookings". You MUST use the numeric ID found in the context. If multiple students have the same first name, use the "students" list to disambiguate. Never guess an ID.
      3. If asked about today's schedule, filter context by today's day of the week.
      3. **CALENDAR: You are strictly in the year 2026. All schedules, dates, and historical references must align with the 2026 Gregorian calendar.**
      4. **FORMATTING: ACHIEVE A "BEST-IN-CLASS" MINIMALIST LOOK.**
      5. Avoid dense bullet lists. Use a clean "Dashboard-style" layout with bold section headers and line breaks.
      6. **BANNED**: Do not say "no duration provided" or "Online (Zoom)". Just say the platform name if it's there.
      7. Example Layout:
         ### 📍 **Class Name**
         **16:15** | Zoom
         • Sunday, Tuesday
         
         ---
         
      8. Use "---" lines strictly between different items to create horizontal separation.
      9. Be professional, helpful, and ultra-concise. Speak as a premium AI companion.

      ### ⚡️ AGENTIC ACTIONS (PROPOSALS)
      If the lecturer asks you to perform an action (e.g., text a student), you MUST propose it using the following JSON block at the end of your response:
      {
        "action": "send_message",
        "student_id": number,
        "student_name": "string",
        "content": "the message text you propose to send"
      }
      
      OR for Intake Setup:
      {
        "action": "create_intake_setup",
        "intake": {
          "name": "Intake Name",
          "description": "Short description",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD",
          "max_students": number
        },
        "classes": [
          {
            "name": "Class Name",
            "venue": "Online" | "string",
            "days_of_week": "Monday,Wednesday",
            "start_time": "HH:MM",
            "end_time": "HH:MM"
          }
        ],
        "groups": [
          {
            "name": "Group Name",
            "class_index": number (index of the class in the classes array)
          }
        ]
      }
      
      CRITICAL: You are an advisor. You CANNOT perform these actions yourself. You only PROPOSE them using the JSON syntax above.
      
      ### 🕒 SCHEDULING RULES (STRICT)
      1. **Working Hours**: Only propose classes within the lecturer's \"working_hours\" found in the profile context.
      2. **Conflict Management**: Check the \"intakes\" and \"upcoming_bookings\" lists. If a proposed class overlaps with an existing class or booking, you MUST suggest a different time or warn the lecturer.
      3. **Automation**: When a lecturer says \"I want an intake in March\", automatically calculate proper start/end dates and suggest a logical schedule based on their available slots.
      
      CRITICAL: You are an advisor. You CANNOT send messages yourself. You only PROPOSE them using the JSON syntax above. The lecturer will see a "Confirm" button to execute it.
      When proposing a message, also provide a friendly natural language response explaining what you're doing.`;

            const fullMessages: AIChatMessage[] = [
                { role: 'system', content: systemPrompt },
                ...messages
            ];

            // Build attempts: try each key with primary model, then each key with fallback model
            const attempts: { key: string; model: string; label: string }[] = [];
            if (GROQ_API_KEY) {
                attempts.push({ key: GROQ_API_KEY, model: GROQ_MODEL, label: 'primary key + primary model' });
            }
            if (GROQ_BACKUP_KEY) {
                attempts.push({ key: GROQ_BACKUP_KEY, model: GROQ_MODEL, label: 'backup key + primary model' });
            }
            if (GROQ_API_KEY) {
                attempts.push({ key: GROQ_API_KEY, model: GROQ_FALLBACK_MODEL, label: 'primary key + fallback model' });
            }
            if (GROQ_BACKUP_KEY) {
                attempts.push({ key: GROQ_BACKUP_KEY, model: GROQ_FALLBACK_MODEL, label: 'backup key + fallback model' });
            }

            let lastError: any = null;
            for (const attempt of attempts) {
                try {
                    console.log(`Trying Groq API: ${attempt.label}`);
                    const response = await callGroqApi(attempt.key, attempt.model, fullMessages);
                    const aiContent = response.data.choices[0].message.content.trim();
                    console.log(`Success with: ${attempt.label}`);

                    let savedMsg = null;
                    if (sessionId) {
                        savedMsg = await this.saveMessage(sessionId, 'assistant', aiContent);
                    }
                    return {
                        text: aiContent,
                        id: savedMsg?.id,
                        status: savedMsg?.action_status || 'idle'
                    };
                } catch (err: any) {
                    lastError = err;
                    console.error(`Groq API failed (${attempt.label}):`, err?.response?.data || err.message);
                }
            }

            // All attempts failed
            console.error('All Groq API attempts failed.');
            return { text: "I'm having trouble connecting to my brain right now. Please try again later." };
        } catch (error: any) {
            console.error('Unexpected error in getChatResponse:', error);
            return { text: "I encountered an error processing your request." };
        }
    }
};
