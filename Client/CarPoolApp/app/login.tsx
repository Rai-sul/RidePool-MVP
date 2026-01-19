import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const { login, register, loginWithOAuth, loading, error } = useAuthContext();
  const router = useRouter();

  const handleSubmit = async () => {
    if (isLogin) {
      const result = await login(email, password);
      if (result.success) {
        router.replace('/home');
      }
    } else {
      const result = await register({ email, password, full_name: fullName, phone });
      if (result.success) {
        router.replace('/profile-setup');
      }
    }
  };

  const isFormValid = () => {
    if (isLogin) {
      return email && password;
    }
    return email && password && fullName;
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
      <View style={styles.content}>
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
        </Text>

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
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
            placeholder="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
