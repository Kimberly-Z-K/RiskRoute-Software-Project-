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
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

export default function Login({ navigation }) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    console.log({ email, password });
    navigation.navigate('MainTabs');
  };

  const handleSignUpPress = () => {
    navigation.navigate('SignUP');
  };

  const handleForgotPassword = () => {
  navigation.navigate('ForgotPassword'); // make sure this screen exists
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>

          {/* LOGO SECTION (UNCHANGED) */}
          <View style={styles.logoContainer}>
            <Text style={styles.title}>Login</Text>
            <Image
              source={require('../assets/iLovePDF2-bg-removed.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.InputS}>

            {/* EMAIL */}
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
                />
              </View>
            </View>

            {/* PASSWORD */}
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
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.forgotContainer}>
  <TouchableOpacity onPress={handleForgotPassword}>
    <Text style={styles.forgotText}>Forgot Password?</Text>
  </TouchableOpacity>
</View>

          </View>
        </View>
      </ScrollView>

      {/* FIXED BUTTON */}
      <View style={styles.fixedBottom}>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <TouchableOpacity onPress={handleSignUpPress}>
            <Text style={styles.loginLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingStart: 0,
    flex: 1,
    backgroundColor: '#E6EEFB',
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 140,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  title: {
    fontSize: 45,
    fontWeight: 'bold',
    color: '#000',
    marginTop: '28%',
    marginLeft: '30%',
    padding: 0,
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
    marginBottom: '10%',
  },

  logo: {
    position: 'absolute',
    marginRight: '80%',
    marginBottom: 20,
    bottom: 0,
    left: 0,
    width: 500,
    height: 400,
  },

  InputS: {
    marginTop: 0,
  },

  inputContainer: {
    marginBottom: 20,
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
    marginLeft: 10,
    fontSize: 15,
    color: '#000',
  },

  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E6EEFB',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  forgotContainer: {
  alignItems: 'flex-end',
  marginTop: 5,
  marginBottom: 10,
},

forgotText: {
  color: '#000',
  fontSize: 13,
},

  footerText: {
    color: '#9CA3AF',
    marginRight: 5,
  },

  loginLink: {
    marginBottom: 50,
    color: '#000',
    fontWeight: 'bold',
  },
});