import { useState, useCallback } from 'react';
import { callClaude } from '../utils/api';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const generate = useCallback(async ({ messages, system, maxTokens, temperature }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await callClaude({ messages, system, maxTokens, temperature });
      setResult(data.content);
      return data.content;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return { generate, loading, error, result, reset };
}

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (content, system) => {
    const userMsg = { role: 'user', content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    setError(null);

    try {
      const data = await callClaude({
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        system,
        maxTokens: 4096,
        temperature: 0.7
      });
      const assistantMsg = { role: 'assistant', content: data.content };
      setMessages(prev => [...prev, assistantMsg]);
      return data.content;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sendMessage, loading, error, clearChat, setMessages };
}
