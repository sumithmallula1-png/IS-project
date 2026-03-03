import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `You are a smart, friendly AI navigator built into the Smart Email Organizer app. You help university students manage, understand, and NAVIGATE their emails.

You MUST ALWAYS respond with valid JSON in this exact format:
{"reply": "your message to the user", "action": null}

When the user wants to navigate somewhere, include an action:
{"reply": "Taking you to your hackathon emails!", "action": {"type": "navigate_category", "category": "Hackathons"}}

Available actions:
1. {"type": "navigate_category", "category": "<name>"} - Navigate to a category. Valid categories: Events, Academics, Hackathons, Personal, Spam
2. {"type": "search_emails", "query": "<search text>"} - Search emails by keyword, sender name, or topic
3. {"type": "select_email", "emailSubject": "<partial or full subject>"} - Open a specific email by its subject
4. {"type": "go_dashboard"} - Go back to the main dashboard view

Your capabilities:
- Navigate users to email categories when they ask (e.g. "show me hackathon emails" → navigate_category)
- Search for emails by sender, topic, or keyword (e.g. "find emails from Prof. Johnson" → search_emails)
- Open specific emails (e.g. "open the assignment deadline email" → select_email)
- Go back to dashboard (e.g. "go back", "show all categories" → go_dashboard)
- Summarize emails or categories
- Answer questions about their emails
- Give productivity tips

Guidelines:
- ALWAYS respond with valid JSON. Never respond with plain text.
- Be concise and friendly. Use emojis occasionally 😊
- When the user clearly wants to navigate, ALWAYS include an action
- When the user asks a question or wants info, set action to null
- Keep replies under 150 words
- If asked to send/delete emails, explain you can only help with reading and navigating`;

router.post('/', async (req, res) => {
    try {
        const { message, history = [], emailSummary = '' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Build the system prompt with email context if available
        let contextPrompt = SYSTEM_PROMPT;
        if (emailSummary) {
            contextPrompt += `\n\nHere is a summary of the user's recent emails:\n${emailSummary}`;
        }

        // Build messages array with conversation history for multi-turn context
        const chatMessages = [
            { role: 'system', content: contextPrompt }
        ];

        // Add conversation history (limit to last 10 exchanges to stay within token limits)
        const recentHistory = history.slice(-20); // last 20 messages (10 exchanges)
        for (const msg of recentHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
                chatMessages.push({ role: msg.role, content: msg.content });
            }
        }

        const completion = await groq.chat.completions.create({
            messages: chatMessages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.4,
            max_tokens: 800,
            response_format: { type: 'json_object' }
        });

        const rawContent = completion.choices[0]?.message?.content || '{}';
        console.log('[Chat AI] Raw response:', rawContent);

        // Parse the JSON response from the AI
        let reply = "I couldn't generate a response.";
        let action = null;

        try {
            const parsed = JSON.parse(rawContent);
            reply = parsed.reply || reply;
            action = parsed.action || null;
        } catch (parseErr) {
            // If JSON parsing fails, try to extract JSON from the text
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    reply = parsed.reply || rawContent;
                    action = parsed.action || null;
                } catch (e) {
                    reply = rawContent;
                }
            } else {
                reply = rawContent;
            }
        }

        console.log('[Chat AI] Parsed reply:', reply);
        console.log('[Chat AI] Parsed action:', action);

        res.json({ reply, action });
    } catch (error) {
        console.error('Chat error:', error);

        // Provide user-friendly error messages
        if (error.status === 429) {
            res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
        } else if (error.status === 401) {
            res.status(500).json({ error: 'AI service configuration error. Please contact support.' });
        } else {
            res.status(500).json({ error: 'Failed to process chat. Please try again.' });
        }
    }
});

export default router;
