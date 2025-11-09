import { useState, useRef, useEffect } from 'react';
import { ModeSelector, AIMode } from './components/ModeSelector';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { sendTherapistMessage, assessCompletion } from './services/gemini-therapist';
import { splitMessageIntoHumanParts, getMessageDelay } from './utils/messageSplitter';
import { buildCombinedUserMessage } from './utils/intuition';

interface Message {
  role: 'user' | 'model';
  parts: string;
}

function App() {
  const [mode, setMode] = useState<AIMode>('therapist');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModeSwitch, setShowModeSwitch] = useState(false);
  const [userBuffer, setUserBuffer] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // No timer-based completion; we ask Gemini for yes/no completeness.

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const finalizeReply = async (bufferSnapshot: string[]) => {
    const combinedUserText = buildCombinedUserMessage(bufferSnapshot);
    setIsLoading(true);

    try {
      let response: string;
      let suggestedMode: AIMode | null = null;
      const history = [...messages];

      switch (mode) {
        case 'therapist': {
          const therapistResponse = await sendTherapistMessage(combinedUserText, history, true);
          response = therapistResponse.message;
          suggestedMode = therapistResponse.suggestedMode;
          break;
        }
        default:
          response = 'Something went wrong. Please try again.';
      }

      const messageParts = splitMessageIntoHumanParts(response);

      for (let i = 0; i < messageParts.length; i++) {
        const delay = getMessageDelay(i, messageParts.length);
        await new Promise(resolve => setTimeout(resolve, delay));
        const aiMessage: Message = { role: 'model', parts: messageParts[i] };
        setMessages((prev) => [...prev, aiMessage]);
      }

      if (suggestedMode && suggestedMode !== 'general' && suggestedMode !== mode) {
        setTimeout(() => {
          setShowModeSwitch(true);
          setTimeout(() => {
            setMode(suggestedMode!);
            setShowModeSwitch(false);
          }, 2000);
        }, 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'model',
        parts: 'I apologize, but I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setUserBuffer([]);
    }
  };

  const sendMessage = async (userMessage: string) => {
    const newUserMessage: Message = {
      role: 'user',
      parts: userMessage,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setShowModeSwitch(false);

    // Add to buffer
    const nextBuffer = [...userBuffer, userMessage];
    setUserBuffer(nextBuffer);

    // Ask Gemini if the message(s) are complete. Only reply on 'yes'.
    try {
      const decision = await assessCompletion(
        buildCombinedUserMessage(nextBuffer),
        [...messages, newUserMessage]
      );
      if (decision === 'no') {
        // Do not reply yet; wait for the user to continue.
        return;
      }
      // decision === 'yes' → reply to the combined user buffer
      await finalizeReply(nextBuffer);
    } catch (e) {
      console.error('Completion assess error:', e);
      // If assessment fails, reply anyway so the conversation doesn’t stall
      await finalizeReply(nextBuffer);
    }
  };

  const handleModeChange = (newMode: AIMode) => {
    setMode(newMode);
    setShowModeSwitch(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-4">
            BUB AI v1.1
          </h1>
          <p className="text-center text-gray-600 text-sm mb-4">
            Your companion through heartbreak and healing
          </p>
          {showModeSwitch && (
            <div className="mt-4 text-center">
              <p className="text-sm text-teal-600 font-medium animate-fade-in">
                Switching to a mode that might help you better...
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 chat-container">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 max-w-md shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                  Welcome to BUB AI
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  This is a safe space to share what you're feeling. Choose a mode above and start the conversation whenever you're ready.
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage key={index} role={message.role} content={message.parts} />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white/80 backdrop-blur-md border-t border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={sendMessage} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
