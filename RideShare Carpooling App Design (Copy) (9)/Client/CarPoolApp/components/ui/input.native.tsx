import React from 'react';
import { TextInput, View } from 'react-native';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
};

export function Input({ 
  value, 
  onChangeText, 
  placeholder = '', 
  className = '',
  autoFocus = false,
  secureTextEntry = false,
  keyboardType = 'default'
}: InputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      autoFocus={autoFocus}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      className={`border border-gray-300 rounded-lg px-4 py-3 bg-white ${className}`}
    />
  );
}
