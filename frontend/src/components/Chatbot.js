import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hi! 👋 I\'m FoodShare Assistant. How can I help you today?',
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header only if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('http://localhost:5000/api/chatbot/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: inputMessage,
          conversationHistory: messages
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(data.timestamp)
        };

        // Simulate typing delay
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, assistantMessage]);
        }, 500);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setIsTyping(false);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared! How can I help you?',
        timestamp: new Date()
      }
    ]);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button 
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label="Toggle chatbot"
      >
        {isOpen ? (
          <span className="close-icon">✕</span>
        ) : (
          <div className="chatbot-icon">
            <span className="icon-emoji">🍽️</span>
            <span className="icon-text">AI</span>
          </div>
        )}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <span className="avatar-emoji">🍽️</span>
              </div>
              <div className="chatbot-title">
                <h3>FoodShare Assistant</h3>
                <span className="chatbot-status">
                  <span className="status-dot"></span>
                  Online
                </span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button 
                className="header-action-btn" 
                onClick={clearChat}
                title="Clear chat"
              >
                🗑️
              </button>
              <button 
                className="header-action-btn" 
                onClick={toggleChat}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="message-avatar">🍽️</div>
                )}
                <div className="message-content">
                  <div className="message-bubble">
                    {msg.content}
                  </div>
                  <div className="message-time">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="message-avatar user">👤</div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="message assistant typing">
                <div className="message-avatar">🍽️</div>
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input-container">
            <div className="chatbot-input-wrapper">
              <textarea
                ref={inputRef}
                className="chatbot-input"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                rows="1"
              />
              <button 
                className="chatbot-send-btn"
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            <div className="chatbot-footer-text">
              Powered by Gemini AI
            </div>
          </div>
        </div>
      )}
    </>
  );
}

