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
import {supabase} from '../lib/supabase';

export default function SignUP({ navigation }) {

  const [role, setRole] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [license, setLicense] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setShowDropdown(false);

    if (selectedRole !== 'Driver') {
      setPhoneNo('');
      setLicense('');
    }
  };

const handleSignUp = async () => {
  try {
    // validation
    if (!email || !password || !name || !surname || !role) {
      alert('Please fill in all required fields');
      return;
    }

    if (role === 'Driver' && (!phoneNo || !license)) {
      alert('Driver must include phone number and license');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
       options: {
          data: {
            full_name: name,
            phone_number: phoneNo,
          },
        },
    });

    if (error) throw error;

    const user = data.user;

    // insert into tables
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          user_id: user.id,
          user_name: name + ' ' + surname,
          user_role: role,
          email: email,
        },
      ]);

    if (userError) throw userError;

    //drivers table
    if (role === 'Driver') {
      const { error: driverError } = await supabase
        .from('drivers')
        .insert([
          {
            driver_id: user.id,
            license_number: license,
            phone: phoneNo,
            driver_username: name + ' ' + surname,
            email: email,
          },
        ]);

      if (driverError) throw driverError;
    }

    //managers table
    if (role === 'Manager') {
      await supabase.from('managers').insert([
        { 
          user_id: user.id ,
          manager_username: name + ' ' + surname,
        }
      ]);
    }

    //admin table
    if (role === 'Admin') {
      await supabase.from('admins').insert([{ user_id: user.id }]);
    }

    alert('Account created successfully');

    //navigate to login
    navigation.navigate('Login');

  } catch (err) {
    alert(err.message);
  }
};

  const handleLoginPress = () => {
    navigation.navigate('Login');
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
            <Text style={styles.title}>Sign-Up</Text>
            <Image
              source={require('../assets/iLovePDF2-bg-removed.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.InputS}>

            {/* DROPDOWN for roles*/}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Role</Text>

              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Ionicons name="person-circle-outline" size={20} color="#9CA3AF" />
                <Text style={{ marginLeft: 10, color: role ? '#000' : '#9CA3AF' }}>
                  {role || 'Choose role'}
                </Text>
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdown}>
                  {['Manager', 'Admin', 'Driver'].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectRole(item)}
                    >
                      <Text>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* NAME */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="first name"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* SURNAME */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Surname</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="Surname"
                  value={surname}
                  onChangeText={setSurname}
                />
              </View>
            </View>

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

            {/* Inputs only the driver gets */}
            {role === 'Driver' && (
              <>
                {/* PHONE */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone No</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter phone number"
                      value={phoneNo}
                      onChangeText={setPhoneNo}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* LICENSE */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>License Number</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="card-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter license number"
                      value={license}
                      onChangeText={setLicense}
                    />
                  </View>
                </View>
              </>
            )}

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

          </View>
        </View>
      </ScrollView>

      {/* FIXED BUTTON */}
      <View style={styles.fixedBottom}>
        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Have an account?</Text>
          <TouchableOpacity onPress={handleLoginPress}>
            <Text style={styles.loginLink}>Login</Text>
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
   marginTop:'30%',
   marginLeft:'25%',
    padding:0,
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
  marginRight:'80%',
  marginBottom:20,
  
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

  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 5,
    elevation: 3,
  },

  dropdownItem: {
    padding: 12,
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

  footerText: {
    color: '#9CA3AF',
    marginRight: 5,
  },

  loginLink: {
    marginBottom:50,
    color: '#000',
    fontWeight: 'bold',
  },
});