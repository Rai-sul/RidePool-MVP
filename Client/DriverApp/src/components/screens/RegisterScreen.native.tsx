import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Car, User, Phone, Mail, FileText, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react-native";
import { authService } from "../../services/auth.service";
import { useDriverStore } from "../../store/useDriverStore";
import { RegisterRequestSchema } from "../../types";

interface RegisterScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export function RegisterScreen({ onBack, onSuccess }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "MALE" as 'MALE' | 'FEMALE' | 'OTHER',
    vehicleType: "CNG" as 'CAR' | 'CNG',
    vehicleModel: "",
    vehiclePlate: "",
    drivingLicense: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitToken, setVisitToken] = useState<string | null>(null);
  const { setUser, setVehicle } = useDriverStore();

  const handleSubmit = async () => {
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const validation = RegisterRequestSchema.safeParse({
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      first_name: formData.firstName,
      last_name: formData.lastName,
      gender: formData.gender,
      vehicle_type: formData.vehicleType,
      vehicle_plate: formData.vehiclePlate,
      vehicle_model: formData.vehicleModel,
      driving_license: formData.drivingLicense,
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Invalid input');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`,
        gender: formData.gender,
        vehicle_type: formData.vehicleType,
        vehicle_model: formData.vehicleModel,
        vehicle_plate: formData.vehiclePlate,
        driving_license: formData.drivingLicense,
      });

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        if (response.data.vehicle) {
          setVehicle(response.data.vehicle);
        }
        const token = `VT-${Date.now().toString().slice(-8)}`;
        setVisitToken(token);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (visitToken) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900" edges={['top', 'bottom']}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 items-center justify-center px-6 py-8">
            <View className="w-full max-w-md">
              <Card className="p-6 shadow-2xl mx-4">
                <View className="items-center mb-6">
                  <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                    <FileText size={32} color="#10B981" />
                  </View>
                  <Text className="text-2xl font-bold text-center mb-2 text-gray-900">Registration Submitted!</Text>
                  <Text className="text-center text-gray-600">
                    Your driver account registration has been received
                  </Text>
                </View>

                <Card className="p-4 bg-amber-50 border-amber-200 mb-6">
                  <Text className="text-sm text-gray-900 font-semibold mb-2">Your Visit Token:</Text>
                  <Text className="text-3xl font-bold text-amber-700 text-center mb-2">{visitToken}</Text>
                  <Text className="text-xs text-gray-600 text-center">
                    Please save this token and bring it when visiting our office for physical verification
                  </Text>
                </Card>

                <View className="gap-3 mb-6">
                  <Text className="font-semibold text-gray-900">Next Steps:</Text>
                  <View className="gap-2">
                    <Text className="text-sm text-gray-700">• Visit our office at Gulshan-2, Dhaka</Text>
                    <Text className="text-sm text-gray-700">• Bring original documents (NID, Driving License, Vehicle Papers)</Text>
                    <Text className="text-sm text-gray-700">• Complete physical verification</Text>
                    <Text className="text-sm text-gray-700">• Receive your driver credentials</Text>
                  </View>
                </View>

                <Button 
                  className="w-full bg-amber-700 h-12"
                  onPress={onSuccess || onBack}
                >
                  <Text className="text-white font-semibold">Continue to App</Text>
                </Button>
              </Card>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900" edges={['top', 'bottom']}>
      <View className="px-6 py-4 flex-row items-center">
        <Pressable onPress={onBack} className="mr-4">
          <ArrowLeft size={24} color="#000000" />
        </Pressable>
        <Text className="text-gray-900 text-xl font-bold">Create Driver Account</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          <View className="px-6 py-4">
            <Card className="p-6 shadow-2xl">
              <View className="gap-6">
                {error && (
                  <View className="bg-red-100 border border-red-400 rounded-lg p-3">
                    <Text className="text-red-700 text-sm">{error}</Text>
                  </View>
                )}

                <View className="gap-4">
                  <Text className="text-lg font-semibold text-gray-900">Personal Information</Text>
                  
                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-2">
                      <Label className="text-gray-900">First Name *</Label>
                      <View className="relative">
                        <View className="absolute left-3 top-3 z-10">
                          <User size={16} color="#9CA3AF" />
                        </View>
                        <Input
                          placeholder="First name"
                          value={formData.firstName}
                          onChangeText={(text) => setFormData({...formData, firstName: text})}
                          className="pl-10 h-12"
                        />
                      </View>
                    </View>
                    <View className="flex-1 gap-2">
                      <Label className="text-gray-900">Last Name *</Label>
                      <Input
                        placeholder="Last name"
                        value={formData.lastName}
                        onChangeText={(text) => setFormData({...formData, lastName: text})}
                        className="h-12"
                      />
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label className="text-gray-900">Email *</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <Mail size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        placeholder="driver@example.com"
                        value={formData.email}
                        onChangeText={(text) => setFormData({...formData, email: text})}
                        className="pl-10 h-12"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label className="text-gray-900">Phone Number *</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <Phone size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        placeholder="+880 1712-345678"
                        value={formData.phone}
                        onChangeText={(text) => setFormData({...formData, phone: text})}
                        className="pl-10 h-12"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label className="text-gray-900">Password *</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <Lock size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        placeholder="Min 6 characters"
                        value={formData.password}
                        onChangeText={(text) => setFormData({...formData, password: text})}
                        className="pl-10 pr-10 h-12"
                        secureTextEntry={!showPassword}
                      />
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3"
                      >
                        {showPassword ? (
                          <EyeOff size={16} color="#9CA3AF" />
                        ) : (
                          <Eye size={16} color="#9CA3AF" />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label className="text-gray-900">Confirm Password *</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <Lock size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
                        className="pl-10 h-12"
                        secureTextEntry={!showPassword}
                      />
                    </View>
                  </View>
                </View>

                <View className="gap-4">
                  <Text className="text-lg font-semibold text-gray-900">Vehicle Information</Text>
                  
                  <View className="gap-2">
                    <Label className="text-gray-900">Vehicle Type *</Label>
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => setFormData({...formData, vehicleType: 'CNG'})}
                        className={`flex-1 h-12 rounded-lg border-2 items-center justify-center ${formData.vehicleType === 'CNG' ? 'border-amber-700 bg-amber-50' : 'border-gray-300 bg-white'}`}
                      >
                        <Text className={`font-semibold ${formData.vehicleType === 'CNG' ? 'text-amber-700' : 'text-gray-600'}`}>CNG</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setFormData({...formData, vehicleType: 'CAR'})}
                        className={`flex-1 h-12 rounded-lg border-2 items-center justify-center ${formData.vehicleType === 'CAR' ? 'border-amber-700 bg-amber-50' : 'border-gray-300 bg-white'}`}
                      >
                        <Text className={`font-semibold ${formData.vehicleType === 'CAR' ? 'text-amber-700' : 'text-gray-600'}`}>Car</Text>
                      </Pressable>
                    </View>
                  </View>
                  
                  <View className="gap-2">
                    <Label className="text-gray-900">Vehicle Model *</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <Car size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        placeholder="e.g., Toyota Axio 2019"
                        value={formData.vehicleModel}
                        onChangeText={(text) => setFormData({...formData, vehicleModel: text})}
                        className="pl-10 h-12"
                      />
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label className="text-gray-900">Vehicle Plate Number *</Label>
                    <Input
                      placeholder="e.g., DHK-GA-11-2345"
                      value={formData.vehiclePlate}
                      onChangeText={(text) => setFormData({...formData, vehiclePlate: text})}
                      className="h-12"
                    />
                  </View>

                  <View className="gap-2">
                    <Label className="text-gray-900">Driving License Number *</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <FileText size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        placeholder="Enter license number"
                        value={formData.drivingLicense}
                        onChangeText={(text) => setFormData({...formData, drivingLicense: text})}
                        className="pl-10 h-12"
                      />
                    </View>
                  </View>
                </View>

                <Button 
                  className="w-full bg-amber-700 h-14 mt-4"
                  disabled={isLoading}
                  onPress={handleSubmit}
                >
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="#FFFFFF" className="mr-2" />
                      <Text className="text-white font-semibold">Submitting...</Text>
                    </View>
                  ) : (
                    <Text className="text-white font-bold text-base">Submit Registration</Text>
                  )}
                </Button>

                <Text className="text-xs text-gray-500 text-center mt-2">
                  * Required fields
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default RegisterScreen;
