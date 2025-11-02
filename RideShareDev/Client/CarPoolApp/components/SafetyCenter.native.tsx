import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Keyboard, Platform } from 'react-native';
import { ArrowLeft, Shield, Phone, Users, AlertCircle, Share2, Lock, X, Check, Plus } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';

type SafetyCenterProps = {
  onBack: () => void;
  userProfile?: { gender?: string } | null;
};

const safetyFeatures = [
  {
    icon: Phone,
    title: 'Emergency Contacts',
    description: 'Add trusted contacts who can track your trips',
    action: 'Manage',
  },
  {
    icon: Share2,
    title: 'Share My Trip',
    description: 'Share live location with friends and family',
    action: 'Share',
  },
  {
    icon: AlertCircle,
    title: '24/7 Safety Line',
    description: 'Call our safety team anytime',
    action: 'Call',
  },
  {
    icon: Lock,
    title: 'Verify Your Ride',
    description: 'Match driver details before you ride',
    action: 'Learn More',
  },
];

const emergencyContactsDefault = [
  { id: '1', name: 'Mom', phone: '+880 1712-111111' },
  { id: '2', name: 'Dad', phone: '+880 1712-222222' },
];

export default function SafetyCenter({ onBack, userProfile }: SafetyCenterProps) {
  const [emergencyContacts, setEmergencyContacts] = useState(emergencyContactsDefault);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  
  const isFemale = userProfile?.gender === 'female';
  const primaryColor = isFemale ? 'bg-pink-500' : 'bg-blue-600';
  const primaryColorLight = isFemale ? 'bg-pink-100' : 'bg-blue-100';
  const primaryColorText = isFemale ? 'text-pink-600' : 'text-blue-600';

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

  const handleEditClick = (contact: typeof emergencyContacts[0]) => {
    setIsAddingNew(false);
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditPhone(contact.phone);
  };
  
  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId('new');
    setEditName('');
    setEditPhone('');
  };

  const handleSave = () => {
    if (editingId === 'new') {
      const newContact = {
        id: Date.now().toString(),
        name: editName,
        phone: editPhone,
      };
      setEmergencyContacts(prev => [...prev, newContact]);
      setIsAddingNew(false);
    } else if (editingId) {
      setEmergencyContacts(prev => prev.map(c => 
        c.id === editingId ? { ...c, name: editName, phone: editPhone } : c
      ));
    }
    setEditingId(null);
    setEditName('');
    setEditPhone('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditName('');
    setEditPhone('');
  };
  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1 pb-20">

      {/* Content */}
      <View className="p-6 space-y-4">
        {/* Emergency Button */}
        <Button
          variant="destructive"
          className="w-full h-16 bg-red-600 hover:bg-red-700 mb-4"
        >
          <View className="flex-row items-center gap-2">
            <AlertCircle className="w-6 h-6 text-white" />
            <Text className="text-white font-semibold text-base">Emergency Alert</Text>
          </View>
        </Button>

        {/* Safety Features */}
        <View className="space-y-6">
          <Text>Safety Features</Text>
          {safetyFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <TouchableOpacity
                key={feature.title}
                className="flex flex-row items-center justify-between p-3 rounded-xl"
              >
                <View className="flex flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </View>
                  <View className="flex-1">
                    <Text>{feature.title}</Text>
                    <Text className="text-sm text-gray-500">{feature.description}</Text>
                  </View>
                </View>
                <Button variant="ghost" size="sm">
                  {feature.action}
                </Button>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Emergency Contacts */}
        <View className="space-y-4 bg-white rounded-2xl p-5">
          <View className="flex flex-row items-center justify-between mb-2">
            <Text className="text-lg font-semibold">Emergency Contacts</Text>
            {!isAddingNew && !editingId && (
              <Button 
                variant="ghost" 
                size="sm" 
                onPress={handleAddNew}
                className="flex-row items-center gap-1"
              >
                <Plus className={`w-4 h-4 ${primaryColorText}`} />
                <Text className={`${primaryColorText} font-medium`}>Add</Text>
              </Button>
            )}
          </View>
          
          <View className="space-y-3">
            {emergencyContacts.map((contact) => {
              const isEditing = editingId === contact.id;
              return (
                <Animated.View 
                  key={contact.id} 
                  className="p-3 mx-2 my-2 bg-gray-50 rounded-xl"
                  style={isEditing ? { marginBottom: keyboardHeight } : {}}
                >
                  {isEditing ? (
                    <View className="space-y-4">
                      <View className="flex flex-row items-center gap-3 mb-3">
                        <View className={`w-10 h-10 ${primaryColorLight} rounded-full flex items-center justify-center`}>
                          <Users className={`w-5 h-5 ${primaryColorText}`} />
                        </View>
                        <Text className="text-base font-semibold">Edit Contact</Text>
                      </View>
                      
                      <View className="space-y-3">
                        <View className="mb-4">
                          <Text className="text-xs text-gray-500 mb-2">Name</Text>
                          <Input
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Contact name"
                            className="w-full"
                          />
                        </View>
                        
                        <View className="mb-4">
                          <Text className="text-xs text-gray-500 mb-2">Phone Number</Text>
                          <Input
                            value={editPhone}
                            onChangeText={setEditPhone}
                            placeholder="+880 XXXX-XXXXXX"
                            keyboardType="phone-pad"
                            className="w-full"
                          />
                        </View>
                      </View>
                      
                      <View className="flex flex-row gap-3 mt-4">
                        <Button variant="outline" size="sm" onPress={handleCancel} className="flex-1 h-11">
                          <View className="flex-row items-center gap-2">
                            <X className="w-4 h-4" />
                            <Text className="font-medium">Cancel</Text>
                          </View>
                        </Button>
                        <Button size="sm" onPress={handleSave} className={`flex-1 h-11 ${primaryColor}`}>
                          <View className="flex-row items-center gap-2">
                            <Check className="w-4 h-4 text-white" />
                            <Text className="text-white font-medium">Save</Text>
                          </View>
                        </Button>
                      </View>
                    </View>
                  ) : (
                    <View className="flex flex-row items-center justify-between">
                      <View className="flex flex-row items-center gap-3 flex-1">
                        <View className={`w-10 h-10 ${primaryColorLight} rounded-full flex items-center justify-center`}>
                          <Users className={`w-5 h-5 ${primaryColorText}`} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium text-base">{contact.name}</Text>
                          <Text className="text-sm text-gray-500 mt-1">{contact.phone}</Text>
                        </View>
                      </View>
                      <Button variant="ghost" size="sm" onPress={() => handleEditClick(contact)}>
                        <Text className={`${primaryColorText} font-medium`}>Edit</Text>
                      </Button>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
          
          {/* Add New Contact Form */}
          {isAddingNew && (
            <Animated.View 
              className="p-3 mx-2 my-2 bg-gray-50 rounded-xl"
              style={{ marginBottom: keyboardHeight }}
            >
              <View className="space-y-4">
                <View className="flex flex-row items-center gap-3 mb-3">
                  <View className={`w-10 h-10 ${primaryColorLight} rounded-full flex items-center justify-center`}>
                    <Plus className={`w-5 h-5 ${primaryColorText}`} />
                  </View>
                  <Text className="text-base font-semibold">Add New Contact</Text>
                </View>
                
                <View className="space-y-3">
                  <View className="mb-4">
                    <Text className="text-xs text-gray-500 mb-2">Name</Text>
                    <Input
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Contact name"
                      className="w-full"
                    />
                  </View>
                  
                  <View className="mb-4">
                    <Text className="text-xs text-gray-500 mb-2">Phone Number</Text>
                    <Input
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="+880 XXXX-XXXXXX"
                      keyboardType="phone-pad"
                      className="w-full"
                    />
                  </View>
                </View>
                
                <View className="flex flex-row gap-3 mt-4">
                  <Button variant="outline" size="sm" onPress={handleCancel} className="flex-1 h-11">
                    <View className="flex-row items-center gap-2">
                      <X className="w-4 h-4" />
                      <Text className="font-medium">Cancel</Text>
                    </View>
                  </Button>
                  <Button size="sm" onPress={handleSave} className={`flex-1 h-11 ${primaryColor}`}>
                    <View className="flex-row items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <Text className="text-white font-medium">Add Contact</Text>
                    </View>
                  </Button>
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Safety Tips */}
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4 mt-4">
          <View className="flex flex-row items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <Text className="text-blue-900">Safety Tips</Text>
          </View>
          <View className="space-y-2">
            <Text className="text-sm text-blue-800">• Always verify driver details before entering the vehicle</Text>
            <Text className="text-sm text-blue-800">• Share your trip with trusted contacts</Text>
            <Text className="text-sm text-blue-800">• Sit in the back seat when riding alone</Text>
            <Text className="text-sm text-blue-800">• Trust your instincts - cancel if something feels wrong</Text>
            <Text className="text-sm text-blue-800">• Keep your phone charged and accessible</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
