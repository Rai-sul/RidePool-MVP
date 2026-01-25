import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Smile, Paperclip, RefreshCw } from './Icons';
import type { UserProfile } from '../contexts/GlobalContext';
import { useChatRealtime } from '../hooks/useChatRealtime';

type ChatScreenProps = {
  userProfile: UserProfile | null;
  recipientId: string;
  recipientName: string;
  poolId?: string;
  onBack: () => void;
};

export default function ChatScreen({ userProfile, recipientId, recipientName, poolId, onBack }: ChatScreenProps) {
  const [messageText, setMessageText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const isFemale = userProfile?.gender === 'female';
  const accentColor = isFemale ? '#ec4899' : '#1f2937';

  // Use real-time chat hook
  const {
    messages,
    loading,
    sending,
    error,
    isConnected,
    sendMessage,
    refresh,
  } = useChatRealtime(userProfile?.id || null, recipientId, poolId);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;
    
    const text = messageText.trim();
    setMessageText('');
    
    const result = await sendMessage(text);
    if (!result.success) {
      // Restore message if failed
      setMessageText(text);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
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

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center gap-3 flex-1">
            <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </TouchableOpacity>
            
            <View className="relative">
              <View className="w-11 h-11 rounded-full items-center justify-center bg-gray-300 border-2 border-white shadow-sm">
                <Text className="text-gray-800 font-semibold text-base">{recipientName[0]?.toUpperCase()}</Text>
              </View>
              <View 
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: isConnected ? '#22c55e' : '#eab308' }}
              />
            </View>
            
            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-lg">{recipientName}</Text>
              <Text className={`text-xs ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                {isConnected ? 'Live' : 'Syncing...'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={refresh} activeOpacity={0.7} className="p-2">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && messages.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={accentColor} />
            <Text className="text-gray-500 mt-3">Loading messages...</Text>
          </View>
        )}

        {/* Error State */}
        {error && messages.length === 0 && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-red-500 text-center mb-4">{error}</Text>
            <TouchableOpacity 
              onPress={refresh}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              <Text className="text-gray-700">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && messages.length === 0 && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray-500 text-center text-lg mb-2">No messages yet</Text>
            <Text className="text-gray-400 text-center">Send a message to start the conversation!</Text>
          </View>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <ScrollView 
            ref={scrollViewRef}
            className="flex-1 bg-gray-50"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex items-center mb-6">
              <View className="bg-gray-200 px-4 py-1.5 rounded-full">
                <Text className="text-xs text-gray-600 font-medium">
                  {messages.length > 0 ? formatDate(messages[0].created_at) : formatDate(new Date().toISOString())}
                </Text>
              </View>
            </View>

            <View className="space-y-3">
              {messages.map((msg, index) => {
                const showTime = index === 0 || 
                  messages[index - 1].is_mine !== msg.is_mine ||
                  (new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime()) > 300000;
                
                return (
                  <View key={msg.id} className={`flex ${msg.is_mine ? 'items-end' : 'items-start'} mb-2`}>
                    <View className={`max-w-[75%] ${msg.is_mine ? 'items-end' : 'items-start'}`}>
                      <View 
                        className={`px-5 py-3 rounded-2xl shadow-sm ${msg.is_mine ? '' : 'bg-white'}`}
                        style={msg.is_mine ? { 
                          borderBottomRightRadius: 4,
                          backgroundColor: accentColor 
                        } : { 
                          borderBottomLeftRadius: 4 
                        }}
                      >
                        <Text className={`${msg.is_mine ? 'text-white' : 'text-gray-900'} text-base leading-6`}>
                          {msg.content}
                        </Text>
                      </View>
                      
                      {showTime && (
                        <View className="flex-row items-center gap-1 mt-1.5 px-2">
                          <Text className="text-xs text-gray-500">
                            {formatTime(msg.created_at)}
                          </Text>
                          {msg.is_mine && (
                            <Text className="text-xs text-gray-500">
                              • {msg.is_read ? 'Read' : 'Sent'}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Input Area - KeyboardAvoidingView handles keyboard, SafeAreaView handles system nav */}
        <View className="px-4 py-3 bg-white border-t border-gray-200">
          <View className="flex-row items-end gap-2">
            <TouchableOpacity className="p-2.5 mb-0.5" activeOpacity={0.7}>
              <Paperclip className="w-6 h-6 text-gray-600" />
            </TouchableOpacity>

            <View className="flex-1 bg-gray-100 rounded-3xl px-5 py-3 flex-row items-center gap-2">
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
                className="flex-1 text-gray-900 text-base max-h-28"
                style={{ minHeight: 24 }}
                returnKeyType="default"
                blurOnSubmit={false}
                editable={!sending}
              />
              <TouchableOpacity activeOpacity={0.7}>
                <Smile className="w-6 h-6 text-gray-400" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleSendMessage}
              activeOpacity={0.7}
              className="p-3 rounded-full mb-0.5"
              style={{ backgroundColor: messageText.trim() && !sending ? accentColor : '#e5e7eb' }}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send className="w-5 h-5" color={messageText.trim() ? '#ffffff' : '#9ca3af'} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
