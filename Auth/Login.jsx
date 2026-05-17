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
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../lib/supabase';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);


  const [showMfaModal, setShowMfaModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Error', 'Please enter email and password');
        return;
      }

      setIsLoggingIn(true);

      // Authenticate password credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const userId = data.user.id;
      setCurrentUserId(userId);

      // Generate a random 6-digit code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Save it to database tracking table
      const { error: dbError } = await supabase
        .from('email_2fa_codes')
        .insert([{ user_id: userId, code: generatedCode }]);

      if (dbError) throw dbError;

      console.log(`[SECURITY] 2FA Code generated for user: ${generatedCode}`);

      // Open the modal
      setShowMfaModal(true);

    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your email.');
      return;
    }

    try {
      setIsVerifying(true);

      // Fetch the latest generated code for this specific user
      const { data, error } = await supabase
        .from('email_2fa_codes')
        .select('code')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].code === verificationCode) {
        Alert.alert('Success', 'Identity verified.');
        setShowMfaModal(false);
        setVerificationCode('');
        navigation.navigate('MainTabs');
      } else {
        Alert.alert('Access Denied', 'Incorrect verification code.');
      }
    } catch (err) {
      Alert.alert('Verification Error', err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleShutOut = async () => {
    await supabase.auth.signOut();
    setShowMfaModal(false);
    setVerificationCode('');
    setCurrentUserId(null);
    Alert.alert('Logged Out', 'You have been shut out due to unverified access.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          <View style={styles.logoContainer}>
            <Text style={styles.title}>Login</Text>
            <Image
              source={require('../assets/iLovePDF2-bg-removed.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.InputS}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="email@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoggingIn} // Disable edits while working
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoggingIn} // Disable edits while working
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isLoggingIn}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.forgotContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} disabled={isLoggingIn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.fixedBottom}>
        <TouchableOpacity
          style={[styles.button, isLoggingIn && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUP')} disabled={isLoggingIn}>
            <Text style={styles.loginLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showMfaModal}
        transparent={true}
        animationType="slide"
        hardwareAccelerated={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="mail-open-outline" size={50} color="#000" style={{ marginBottom: 10 }} />

            <Text style={styles.modalHeader}>Enter Security Code</Text>
            <Text style={styles.modalSubtext}>
              We sent a 6-digit access code to your email account. You must verify your identity to access the system.
            </Text>

            <Text style={{ color: 'red', fontWeight: 900 }}>
              AwunaChoice
            </Text>

            <View style={[styles.inputWrapper, { width: '80%', marginBottom: 25 }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={[styles.input, styles.centerText]}
                placeholder="000000"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isVerifying}
              />
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={handleShutOut}
                disabled={isVerifying}
              >
                <Text style={styles.cancelBtnText}>Shut Out / Exit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleVerifyCode}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#FFF" /> // Modal loader
                ) : (
                  <Text style={styles.confirmBtnText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6EEFB'
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 140
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60
  },
  title: {
    fontSize: 45,
    fontWeight: 'bold',
    color: '#000',
    marginTop: '28%',
    marginLeft: '30%'
  },
  logoContainer: {
    top: -20,
    alignSelf: 'center',
    width: 400,
    height: 300,
    backgroundColor: 'white',
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
    position: 'relative',
    marginBottom: '10%'
  },
  logo: {
    position: 'absolute',
    marginRight: '80%',
    marginBottom: 20,
    bottom: 0,
    left: 0,
    width: 500,
    height: 400
  },
  InputS: {
    marginTop: 0
  },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 14, elevation: 2 },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#000' },
  fixedBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#E6EEFB', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  button: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 25, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#4B5563' }, // Gray style for disabled state
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  forgotContainer: { alignItems: 'flex-end', marginTop: 5, marginBottom: 10 },
  forgotText: { color: '#000', fontSize: 13 },
  footerText: { color: '#9CA3AF', marginRight: 5 },
  loginLink: { marginBottom: 50, color: '#000', fontWeight: 'bold' },

  // --- MODAL FORCE DIALOGUE STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 30, padding: 25, alignItems: 'center', elevation: 10 },
  modalHeader: { fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 10 },
  modalSubtext: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  centerText: { textAlign: 'center', letterSpacing: 4, fontSize: 18, fontWeight: 'bold' },
  modalActionRow: { flexDirection: 'row', width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 25, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#4B5563', fontWeight: '600' },
  confirmBtn: { backgroundColor: '#000' },
  confirmBtnText: { color: '#FFF', fontWeight: '600' }
});
