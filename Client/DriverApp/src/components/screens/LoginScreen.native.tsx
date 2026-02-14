import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Eye, EyeOff, Car, Mail, Lock } from "lucide-react-native";
import { authService } from "../../services/auth.service";
import { useDriverStore } from "../../store/useDriverStore";
import { LoginRequestSchema } from "../../types";

interface LoginScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function LoginScreen({ onLogin, onRegister }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useDriverStore();

  const handleSubmit = async () => {
    setError(null);
    
    const validation = LoginRequestSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Invalid input');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        onLogin();
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 items-center justify-center px-6 py-8">
            <View className="w-full max-w-md">
              <View className="items-center mb-8">
                <View className="w-20 h-20 bg-white rounded-3xl shadow-2xl items-center justify-center mb-4">
                  <Car size={40} color="#B45309" />
                </View>
                <Text className="text-gray-900 text-3xl font-bold mb-2">RidePool Driver</Text>
              </View>

              <Card className="p-6 shadow-2xl mx-4">
                <View className="gap-4">
                  {error && (
                    <View className="bg-red-100 border border-red-400 rounded-lg p-3">
                      <Text className="text-red-700 text-sm">{error}</Text>
                    </View>
                  )}

                  <View className="gap-2">
                    <Label htmlFor="email" className="text-gray-900">Email Address</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <Mail size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        placeholder="driver@example.com"
                        value={email}
                        onChangeText={setEmail}
                        className="pl-10 h-12"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View className="gap-2 mt-4">
                    <Label htmlFor="password" className="text-gray-900">Password</Label>
                    <View className="relative">
                      <View className="absolute left-3 top-3 z-10">
                        <Lock size={16} color="#9CA3AF" />
                      </View>
                      <Input
                        secureTextEntry={!showPassword}
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        className="pl-10 pr-10 h-12"
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

                  <View className="flex-row items-center justify-between mt-4">
                    <View className="flex-row items-center gap-2">
                      <Checkbox 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Text className="text-sm text-gray-900">Remember me</Text>
                    </View>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto"
                    >
                      <Text className="text-sm text-amber-700">Forgot password?</Text>
                    </Button>
                  </View>

                  <Button 
                    className="w-full bg-amber-700 mt-6 h-12"
                    disabled={isLoading}
                    onPress={handleSubmit}
                  >
                    {isLoading ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator color="#FFFFFF" className="mr-2" />
                        <Text className="text-white font-semibold">Signing in...</Text>
                      </View>
                    ) : (
                      <Text className="text-white font-semibold">Sign In</Text>
                    )}
                  </Button>
                </View>

            <View className="relative my-6">
              <View className="absolute inset-0 items-center">
                <View className="w-full border-t border-gray-200" />
              </View>
              <View className="relative items-center">
                <Text className="px-2 bg-white text-gray-500 text-sm">
                  New driver?
                </Text>
              </View>
            </View>

            <Button 
              variant="outline" 
              className="w-full h-12 border-amber-700"
              onPress={onRegister}
            >
              <Text className="text-amber-700 font-semibold">Create Driver Account</Text>
            </Button>
          </Card>

          <View className="items-center mt-6 gap-2 px-4">
            <Text className="text-amber-100 text-sm">
              Need help? Contact support
            </Text>
            <View className="flex-row items-center gap-4">
              <Pressable>
                <Text className="text-gray-900 text-sm font-medium">Terms of Service</Text>
              </Pressable>
              <Text className="text-amber-300">•</Text>
              <Pressable>
                <Text className="text-gray-900 text-sm font-medium">Privacy Policy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>
  );
}

export default LoginScreen;