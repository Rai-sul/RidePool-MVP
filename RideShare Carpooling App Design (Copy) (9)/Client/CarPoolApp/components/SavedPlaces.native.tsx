import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Home, Briefcase, Heart, MapPin, Plus, X, Check } from './Icons';
import { Button } from './ui/button';
import { Input } from './ui/input';

type SavedPlacesProps = {
  onBack: () => void;
  userProfile?: { gender?: string } | null;
};

const savedPlaces = [
  {
    id: '1',
    icon: Home,
    label: 'Home',
    address: 'House 12, Road 5, Dhanmondi, Dhaka',
  },
  {
    id: '2',
    icon: Briefcase,
    label: 'Work',
    address: 'Level 10, Navana Tower, Gulshan 1, Dhaka',
  },
  {
    id: '3',
    icon: Heart,
    label: 'Favorite Spot',
    address: 'Cafe Mango, Banani 11, Dhaka',
  },
];

export default function SavedPlaces({ onBack, userProfile }: SavedPlacesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedPlaces, setEditedPlaces] = useState(savedPlaces);
  const [editLabel, setEditLabel] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const isFemale = userProfile?.gender === 'female';
  const primaryColor = isFemale ? 'bg-pink-500' : 'bg-blue-600';
  const primaryColorLight = isFemale ? 'bg-pink-100' : 'bg-blue-100';
  const primaryColorText = isFemale ? 'text-pink-600' : 'text-blue-600';

  const handleEditClick = (place: typeof savedPlaces[0]) => {
    setIsAddingNew(false);
    setEditingId(place.id);
    setEditLabel(place.label);
    setEditAddress(place.address);
  };
  
  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId('new');
    setEditLabel('');
    setEditAddress('');
  };

  const handleSave = () => {
    if (editingId === 'new') {
      // Add new place
      const newPlace = {
        id: Date.now().toString(),
        icon: MapPin,
        label: editLabel,
        address: editAddress,
      };
      setEditedPlaces(prev => [...prev, newPlace]);
      setIsAddingNew(false);
    } else if (editingId) {
      // Edit existing place
      setEditedPlaces(prev => prev.map(p => 
        p.id === editingId ? { ...p, label: editLabel, address: editAddress } : p
      ));
    }
    setEditingId(null);
    setEditLabel('');
    setEditAddress('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditLabel('');
    setEditAddress('');
  };

  return (
    <ScrollView className="h-full w-full bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
      {/* Header */}
      {/* Removed custom header */}

      {/* Content */}
      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-5 space-y-4 my-4">
          {editedPlaces.map((place) => {
            const Icon = place.icon;
            const isEditing = editingId === place.id;
            
            return (
              <View
                key={place.id}
                className="p-4 mx-2 my-2 border-b last:border-b-0 rounded-lg"
              >
                {isEditing ? (
                  <View className="space-y-4">
                    <View className="flex flex-row items-center gap-3 mb-3">
                      <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </View>
                      <Text className="text-base font-semibold">Edit Place</Text>
                    </View>
                    
                    <View className="space-y-3">
                      <View>
                        <Text className="text-xs text-gray-500 mb-2">Label</Text>
                        <Input
                          value={editLabel}
                          onChangeText={setEditLabel}
                          placeholder="e.g., Home, Work"
                          className="w-full"
                        />
                      </View>
                      
                      <View>
                        <Text className="text-xs text-gray-500 mb-2">Address</Text>
                        <Input
                          value={editAddress}
                          onChangeText={setEditAddress}
                          placeholder="Enter full address"
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
                  <View className="flex flex-row items-start gap-3">
                    <View className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-base">{place.label}</Text>
                      <Text className="text-sm text-gray-500 mt-1">{place.address}</Text>
                    </View>
                    <Button variant="ghost" size="sm" onPress={() => handleEditClick(place)}>
                      <Text className={`${primaryColorText} font-medium`}>Edit</Text>
                    </Button>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Add New Place Button */}
        {!isAddingNew && !editingId && (
          <Button 
            className={`w-full h-12 my-4 ${primaryColor}`}
            onPress={handleAddNew}
          >
            <View className="flex-row items-center gap-2">
              <Plus className="w-5 h-5 text-white" />
              <Text className="text-white font-medium">Add New Place</Text>
            </View>
          </Button>
        )}
        
        {/* Add New Place Form */}
        {isAddingNew && (
          <View className="bg-white rounded-2xl p-5 my-4 mx-2">
            <View className="space-y-4">
              <View className="flex flex-row items-center gap-3 mb-3">
                <View className={`w-10 h-10 ${primaryColorLight} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Plus className={`w-5 h-5 ${primaryColorText}`} />
                </View>
                <Text className="text-base font-semibold">Add New Place</Text>
              </View>
              
              <View className="space-y-3">
                <View>
                  <Text className="text-xs text-gray-500 mb-2">Label</Text>
                  <Input
                    value={editLabel}
                    onChangeText={setEditLabel}
                    placeholder="e.g., Home, Work, Gym"
                    className="w-full"
                  />
                </View>
                
                <View>
                  <Text className="text-xs text-gray-500 mb-2">Address</Text>
                  <Input
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Enter full address"
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
                    <Text className="text-white font-medium">Add Place</Text>
                  </View>
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}