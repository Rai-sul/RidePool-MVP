import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');

  const { login, register, loginWithOAuth, loading, error } = useAuthContext();
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.mode === 'signup') {
      setIsLogin(false);
    } else if (params.mode === 'login') {
      setIsLogin(true);
    }
  }, [params.mode]);

  const handleSubmit = async () => {
    console.log('[Login] handleSubmit called, isLogin:', isLogin);
    if (isLogin) {
      console.log('[Login] Calling login with:', email);
      const result = await login(email, password);
      console.log('[Login] Login result:', result.success);
      if (result.success) {
        router.replace('/home');
      }
    } else {
      console.log('[Login] Calling register with:', email, firstName, lastName);
      const result = await register({ 
        email, 
        password, 
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone || undefined, 
        gender,
        gender_preference: 'ANY',
      });
      console.log('[Login] Register result:', result.success);
      if (result.success) {
        // After successful signup, go back to login mode instead of directly to home
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
        setGender('MALE');
      }
    }
  };

  const isFormValid = () => {
    if (isLogin) {
      return email && password;
    }
    return email && password && firstName && lastName && gender;
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    const result = await loginWithOAuth(provider);
    if (result.success) {
      router.replace('/home');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
          </Text>

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Phone (optional, e.g. +8801712345678)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Password (8+ chars, upper, lower, number)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'MALE' && styles.genderButtonActive]}
                  onPress={() => setGender('MALE')}
                >
                  <Text style={[styles.genderText, gender === 'MALE' && styles.genderTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'FEMALE' && styles.genderButtonActiveFemale]}
                  onPress={() => setGender('FEMALE')}
                >
                  <Text style={[styles.genderText, gender === 'FEMALE' && styles.genderTextActive]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'OTHER' && styles.genderButtonActive]}
                  onPress={() => setGender('OTHER')}
                >
                  <Text style={[styles.genderText, gender === 'OTHER' && styles.genderTextActive]}>Other</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, !isFormValid() && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !isFormValid()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>

          {isLogin && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.oauthButton}
                onPress={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                <Text style={styles.oauthButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.oauthButton}
                onPress={() => handleOAuthLogin('facebook')}
                disabled={loading}
              >
                <Text style={styles.oauthButtonText}>Continue with Facebook</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  genderButton: {
    flex: 1,
    height: 45,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  genderButtonActiveFemale: {
    borderColor: '#E91E63',
    backgroundColor: '#fce4ec',
  },
  genderText: {
    fontSize: 14,
    color: '#666',
  },
  genderTextActive: {
    fontWeight: '600',
    color: '#333',
  },
  button: {
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#2196F3',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  oauthButton: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  oauthButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
