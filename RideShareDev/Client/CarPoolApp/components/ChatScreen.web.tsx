import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Smile, Paperclip, MoreVertical, Phone, Video } from './Icons';
import type { UserProfile } from '../contexts/GlobalContext';

type ChatScreenProps = {
  userProfile: UserProfile | null;
  friendId?: string;
  friendName?: string;
  onBack: () => void;
};

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'friend';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
};

export default function ChatScreen({ userProfile, friendId = 'RS2024', friendName = 'Raisul', onBack }: ChatScreenProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey! Are you available for the ride today?',
      sender: 'friend',
      timestamp: new Date(Date.now() - 3600000),
      status: 'read'
    },
    {
      id: '2',
      text: 'Yes! What time are you planning to leave?',
      sender: 'user',
      timestamp: new Date(Date.now() - 3500000),
      status: 'read'
    },
    {
      id: '3',
      text: 'Around 8:30 AM from Mirpur. Does that work for you?',
      sender: 'friend',
      timestamp: new Date(Date.now() - 3400000),
      status: 'read'
    },
    {
      id: '4',
      text: 'Perfect! I\'ll be ready. See you then!',
      sender: 'user',
      timestamp: new Date(Date.now() - 3300000),
      status: 'read'
    },
  ]);
  
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const isFemale = userProfile?.gender === 'female';
  const accentColor = isFemale ? '#ec4899' : '#1f2937';

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: 'user',
        timestamp: new Date(),
        status: 'sent'
      };
      
      setMessages([...messages, newMessage]);
      setMessage('');
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ top: scrollViewRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ top: scrollViewRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-row items-center gap-3 flex-1">
          <button onClick={onBack} className="p-0 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          
          <div className="relative">
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-300 border-2 border-white shadow-sm">
              <span className="text-gray-800 font-semibold text-base">{friendName[0]}</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          
          <div className="flex-1">
            <p className="text-gray-900 font-bold text-lg">{friendName}</p>
            <p className="text-xs text-green-600">Active now</p>
          </div>
        </div>
        
        <button className="p-0 hover:opacity-70 transition-opacity">
          <MoreVertical className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollViewRef}
        className="flex-1 px-4 overflow-y-auto bg-gray-50"
        style={{ paddingTop: '16px', paddingBottom: '20px' }}
      >
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gray-200 px-4 py-1.5 rounded-full">
            <span className="text-xs text-gray-600 font-medium">{formatDate(new Date())}</span>
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const showTime = index === 0 || 
              messages[index - 1].sender !== msg.sender ||
              (msg.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 300000;
            
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div 
                    className={`px-5 py-3 rounded-2xl shadow-sm ${isUser ? '' : 'bg-white'}`}
                    style={isUser ? { 
                      borderBottomRightRadius: '4px',
                      backgroundColor: accentColor 
                    } : { 
                      borderBottomLeftRadius: '4px' 
                    }}
                  >
                    <p className={`${isUser ? 'text-white' : 'text-gray-900'} text-base leading-6`}>
                      {msg.text}
                    </p>
                  </div>
                  
                  {showTime && (
                    <div className="flex flex-row items-center gap-1 mt-1.5 px-2">
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                      </span>
                      {isUser && msg.status && (
                        <span className="text-xs text-gray-500">
                          • {msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 pb-6 bg-white border-t border-gray-200">
        <div className="flex flex-row items-end gap-2">
          <button className="p-2.5 mb-0.5 hover:opacity-70 transition-opacity">
            <Paperclip className="w-6 h-6 text-gray-600" />
          </button>

          <div className="flex-1 bg-gray-100 rounded-3xl px-5 py-3 flex flex-row items-center gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              maxLength={500}
              rows={1}
              className="flex-1 text-gray-900 text-base bg-transparent border-none outline-none resize-none placeholder-gray-400"
              style={{ minHeight: '24px', maxHeight: '112px' }}
            />
            <button className="hover:opacity-70 transition-opacity">
              <Smile className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <button 
            onClick={handleSendMessage}
            className="p-3 rounded-full mb-0.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: message.trim() ? accentColor : '#e5e7eb' }}
            disabled={!message.trim()}
          >
            <Send className="w-5 h-5" color={message.trim() ? '#ffffff' : '#9ca3af'} />
          </button>
        </div>
      </div>
    </div>
  );
}
