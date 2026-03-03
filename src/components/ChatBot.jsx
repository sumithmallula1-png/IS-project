import { useState, useRef, useEffect, useMemo } from 'react';

const SUGGESTIONS = [
    "Show me hackathon emails",
    "Search for assignment deadlines",
    "Take me to personal emails",
    "Summarize my recent emails",
    "Go back to dashboard"
];

const ACTION_LABELS = {
    navigate_category: '📂 Navigating to category...',
    search_emails: '🔍 Searching emails...',
    select_email: '📧 Opening email...',
    go_dashboard: '🏠 Going to dashboard...'
};

export default function ChatBot({ emails = [], onNavigateCategory, onSearch, onSelectEmail, onGoDashboard }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! I'm your email navigator. I can help you find emails, navigate categories, or answer questions. Try saying \"show me hackathon emails\" or \"search for assignment\"!" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastAction, setLastAction] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Clear action indicator after a delay
    useEffect(() => {
        if (lastAction) {
            const timer = setTimeout(() => setLastAction(null), 2500);
            return () => clearTimeout(timer);
        }
    }, [lastAction]);

    // Build a compact email summary for the chatbot context
    const emailSummary = useMemo(() => {
        if (!emails || emails.length === 0) return '';
        const summaries = emails.slice(0, 30).map((e, i) => {
            const from = e.from?.split('<')[0]?.trim() || e.from || 'Unknown';
            const date = e.date ? new Date(e.date).toLocaleDateString() : '';
            return `${i + 1}. [${e.category || 'Uncategorized'}] "${e.subject}" from ${from} (${date}) - ${e.snippet?.substring(0, 80) || ''}`;
        });
        return summaries.join('\n');
    }, [emails]);

    // Execute an action returned by the AI
    const executeAction = (action) => {
        if (!action || !action.type) return;

        setLastAction(action.type);

        switch (action.type) {
            case 'navigate_category':
                if (action.category && onNavigateCategory) {
                    onNavigateCategory(action.category);
                }
                break;
            case 'search_emails':
                if (action.query && onSearch) {
                    onSearch(action.query);
                }
                break;
            case 'select_email':
                if (action.emailSubject && onSelectEmail) {
                    onSelectEmail(action.emailSubject);
                }
                break;
            case 'go_dashboard':
                if (onGoDashboard) {
                    onGoDashboard();
                }
                break;
            default:
                break;
        }
    };

    const sendMessage = async (text) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        const userMessage = { role: 'user', content: messageText };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Send conversation history (exclude the initial greeting for cleaner context)
            const history = updatedMessages
                .slice(1) // skip initial greeting
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: messageText,
                    history,
                    emailSummary
                })
            });

            const data = await response.json();
            console.log('[ChatBot] AI response:', data);
            const assistantMessage = { role: 'assistant', content: data.reply || "Sorry, I couldn't process that." };
            setMessages(prev => [...prev, assistantMessage]);

            // Execute any navigation action returned by the AI
            if (data.action) {
                console.log('[ChatBot] Executing action:', data.action);
                executeAction(data.action);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleClearChat = () => {
        setMessages([
            { role: 'assistant', content: "Hi! I'm your email navigator. How can I help you today?" }
        ]);
        setLastAction(null);
    };

    return (
        <>
            <button
                className="chat-fab"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Open AI Navigator"
            >
                {isOpen ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>}
            </button>

            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <div className="chat-header__avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg></div>
                        <div>
                            <div className="chat-header__title">AI Navigator</div>
                            <div className="chat-header__status">
                                {emails.length > 0
                                    ? `${emails.length} emails loaded · Can navigate for you`
                                    : 'Ready to help you navigate'}
                            </div>
                        </div>
                        {messages.length > 1 && (
                            <button
                                className="chat-clear-btn"
                                onClick={handleClearChat}
                                title="Clear chat"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Action indicator */}
                    {lastAction && (
                        <div className="chat-action-indicator">
                            {ACTION_LABELS[lastAction] || 'Performing action...'}
                        </div>
                    )}

                    <div className="chat-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`chat-message chat-message--${msg.role}`}>
                                {msg.content}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-message chat-message--assistant">
                                <span className="chat-typing">
                                    <span></span><span></span><span></span>
                                </span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {messages.length === 1 && (
                        <div className="chat-suggestions">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} onClick={() => sendMessage(s)} className="chat-suggestion">
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="chat-input-area">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Try: show me hackathon emails..."
                            disabled={isLoading}
                            className="chat-input"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="chat-send"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
