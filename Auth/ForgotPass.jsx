import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    console.log('Reset password for:', email);
    setIsSubmitted(true);
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />

          <Text style={styles.successTitle}>Check Your Email</Text>

          <Text style={styles.successMessage}>
            We've sent a reset link to {'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <Text style={styles.successSubtext}>
            Please check your inbox and click the link to reset your password.
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleBackToLogin}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSubmitted(false)}>
            <Text style={styles.resendText}>
              Didn't receive email? Resend
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          {/* BACK BUTTON */}
          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          {/* TITLE */}
          <Text style={styles.title}>Forgot{'\n'}Password</Text>

          {/* IMAGE */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/truck-illustration.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* DESCRIPTION */}
          <Text style={styles.description}>
            Enter your email address and we’ll send you a reset link.
          </Text>

          {/* EMAIL INPUT */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="email@gmail.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

        </View>
      </ScrollView>

      {/* FIXED BUTTON */}
      <View style={styles.fixedBottom}>
        <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
          <Text style={styles.buttonText}>Reset Password</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.loginLink}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>

    </KeyboardAvoidingView>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6EEFB',
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    lineHeight: 42,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },

  logo: {
    width: 180,
    height: 90,
  },

  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 30,
    textAlign: 'center',
  },

  inputContainer: {
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 2,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    marginLeft: 10,
  },

  button: {
    backgroundColor: '#000',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    marginTop: 24,
  },

  loginLink: {
    color: '#000',
    fontWeight: '600',
  },

  resendText: {
    marginTop: 20,
    color: '#000',
    textAlign: 'center',
  },

  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
  },

  successMessage: {
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 10,
  },

  emailText: {
    fontWeight: 'bold',
    color: '#000',
  },

  successSubtext: {
    color: '#9CA3AF',
    textAlign: 'center',
  },

  fixedBottom: {
    backgroundColor: '#E6EEFB',
    padding: 20,
  },
});