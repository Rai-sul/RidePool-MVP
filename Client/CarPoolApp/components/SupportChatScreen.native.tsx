import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Animated, Keyboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Smile, Paperclip, MoreVertical } from './Icons';
import type { UserProfile } from '../contexts/GlobalContext';

type SupportChatScreenProps = {
  userProfile: UserProfile | null;
  onBack: () => void;
};

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'friend';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
};

export default function SupportChatScreen({ userProfile, onBack }: SupportChatScreenProps) {
  const friendName = 'Support Assistant';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! Welcome to RideShare Support. How can I assist you today?',
      sender: 'friend',
      timestamp: new Date(Date.now() - 60000),
      status: 'read'
    },
  ]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const isFemale = userProfile?.gender === 'female';
  const accentColor = isFemale ? '#ec4899' : '#1f2937';

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

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
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center gap-3 flex-1">
            <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </TouchableOpacity>
            
            <View className="relative">
              <View className="w-11 h-11 rounded-full items-center justify-center bg-gray-300 border-2 border-white shadow-sm">
                <Text className="text-gray-800 font-semibold text-base">{friendName[0]}</Text>
              </View>
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></View>
            </View>
            
            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-lg">{friendName}</Text>
              <Text className="text-xs text-green-600">Active now</Text>
            </View>
          </View>
          
          <TouchableOpacity activeOpacity={0.7}>
            <MoreVertical className="w-6 h-6 text-gray-600" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 bg-gray-50"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex items-center mb-6">
            <View className="bg-gray-200 px-4 py-1.5 rounded-full">
              <Text className="text-xs text-gray-600 font-medium">{formatDate(new Date())}</Text>
            </View>
          </View>

          <View className="space-y-3">
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const showTime = index === 0 || 
                messages[index - 1].sender !== msg.sender ||
                (msg.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 300000;
              
              return (
                <View key={msg.id} className={`flex ${isUser ? 'items-end' : 'items-start'} mb-2`}>
                  <View className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <View 
                      className={`px-5 py-3 rounded-2xl shadow-sm ${isUser ? '' : 'bg-white'}`}
                      style={isUser ? { 
                        borderBottomRightRadius: 4,
                        backgroundColor: accentColor 
                      } : { 
                        borderBottomLeftRadius: 4 
                      }}
                    >
                      <Text className={`${isUser ? 'text-white' : 'text-gray-900'} text-base leading-6`}>
                        {msg.text}
                      </Text>
                    </View>
                    
                    {showTime && (
                      <View className="flex-row items-center gap-1 mt-1.5 px-2">
                        <Text className="text-xs text-gray-500">
                          {formatTime(msg.timestamp)}
                        </Text>
                        {isUser && msg.status && (
                          <Text className="text-xs text-gray-500">
                            • {msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}
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

        {/* Input Area */}
        <Animated.View 
          className="px-4 py-3 bg-white border-t border-gray-200"
          style={{ marginBottom: keyboardHeight }}
        >
          <View className="flex-row items-end gap-2">
            <TouchableOpacity className="p-2.5 mb-0.5" activeOpacity={0.7}>
              <Paperclip className="w-6 h-6 text-gray-600" />
            </TouchableOpacity>

            <View className="flex-1 bg-gray-100 rounded-3xl px-5 py-3 flex-row items-center gap-2">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
                className="flex-1 text-gray-900 text-base max-h-28"
                style={{ minHeight: 24 }}
                returnKeyType="default"
                blurOnSubmit={false}
              />
              <TouchableOpacity activeOpacity={0.7}>
                <Smile className="w-6 h-6 text-gray-400" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleSendMessage}
              activeOpacity={0.7}
              className="p-3 rounded-full mb-0.5"
              style={{ backgroundColor: message.trim() ? accentColor : '#e5e7eb' }}
              disabled={!message.trim()}
            >
              <Send className="w-5 h-5" color={message.trim() ? '#ffffff' : '#9ca3af'} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
