import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';

const CRAFT_TYPES = [
  'Pottery', 'Weaving', 'Embroidery', 'Wood Carving', 'Metal Work',
  'Jewelry', 'Painting', 'Leather Work', 'Bamboo Craft', 'Stone Craft', 'Other',
];

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Punjabi', 'Kannada', 'Malayalam'];

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', craftType: '', preferredLanguage: 'English', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [craftDropdown, setCraftDropdown] = useState(false);
  const [langDropdown, setLangDropdown] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.craftType) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      if (res.data.success) {
        await AsyncStorage.setItem('ks_token', res.data.data.token);
        await AsyncStorage.setItem('ks_user', JSON.stringify(res.data.data.user));
        router.replace('/(tabs)/dashboard');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bgDark }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['rgba(249,115,22,0.08)', 'transparent']} style={styles.topGlow} />

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.logoBox}>
            <Text style={styles.logoLetters}>KS</Text>
          </LinearGradient>
          <Text style={styles.logoText}>Karigar<Text style={{ color: Colors.saffron }}>Setu</Text></Text>
        </View>

        <Text style={styles.title}>Join KarigarSetu</Text>
        <Text style={styles.subtitle}>Create your free artisan account</Text>

        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textDim} value={form.name} onChangeText={(v) => update('name', v)} />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="artisan@example.com" placeholderTextColor={Colors.textDim} value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Feather name="phone" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="+91 XXXXX XXXXX" placeholderTextColor={Colors.textDim} value={form.phone} onChangeText={(v) => update('phone', v)} keyboardType="phone-pad" />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min. 6 characters" placeholderTextColor={Colors.textDim} value={form.password} onChangeText={(v) => update('password', v)} secureTextEntry={!showPass} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Craft Type Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Craft Type *</Text>
            <TouchableOpacity style={styles.inputWrapper} onPress={() => { setCraftDropdown(!craftDropdown); setLangDropdown(false); }}>
              <Feather name="scissors" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <Text style={[styles.input, !form.craftType && { color: Colors.textDim }]}>
                {form.craftType || 'Select craft type'}
              </Text>
              <Feather name={craftDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textDim} />
            </TouchableOpacity>
            {craftDropdown && (
              <View style={styles.dropdown}>
                {CRAFT_TYPES.map((ct) => (
                  <TouchableOpacity key={ct} style={[styles.dropdownItem, form.craftType === ct && styles.dropdownItemActive]} onPress={() => { update('craftType', ct); setCraftDropdown(false); }}>
                    <Text style={[styles.dropdownText, form.craftType === ct && { color: Colors.saffron }]}>{ct}</Text>
                    {form.craftType === ct && <Feather name="check" size={14} color={Colors.saffron} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Preferred Language */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Language</Text>
            <TouchableOpacity style={styles.inputWrapper} onPress={() => { setLangDropdown(!langDropdown); setCraftDropdown(false); }}>
              <Feather name="globe" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <Text style={styles.input}>{form.preferredLanguage}</Text>
              <Feather name={langDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textDim} />
            </TouchableOpacity>
            {langDropdown && (
              <View style={styles.dropdown}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity key={lang} style={[styles.dropdownItem, form.preferredLanguage === lang && styles.dropdownItemActive]} onPress={() => { update('preferredLanguage', lang); setLangDropdown(false); }}>
                    <Text style={[styles.dropdownText, form.preferredLanguage === lang && { color: Colors.saffron }]}>{lang}</Text>
                    {form.preferredLanguage === lang && <Feather name="check" size={14} color={Colors.saffron} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <GradientButton title="Create Account" onPress={handleRegister} loading={loading} style={{ marginTop: Spacing.md }} />

          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginBtnText}>
              Already have an account?{' '}
              <Text style={{ color: Colors.saffron }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.bgDark, paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  backBtn: { marginTop: Platform.OS === 'ios' ? 56 : 36, marginBottom: Spacing.lg, width: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.xl },
  logoBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoLetters: { color: '#fff', fontFamily: Fonts.outfitBold, fontSize: 14 },
  logoText: { fontSize: 20, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  title: { fontSize: 28, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, fontFamily: Fonts.outfit, marginBottom: Spacing.xl },
  form: {},
  inputGroup: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, fontFamily: Fonts.outfitMedium, fontSize: 13, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 12 },
  inputIcon: { marginRight: 10 },
  input: { color: Colors.textPrimary, fontFamily: Fonts.outfit, fontSize: 15, paddingVertical: 14, flex: 1 },
  eyeBtn: { padding: 4 },
  dropdown: { backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, marginTop: 4, maxHeight: 200, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: 'rgba(249,115,22,0.08)' },
  dropdownText: { color: Colors.textMuted, fontFamily: Fonts.outfit, fontSize: 14 },
  loginBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  loginBtnText: { color: Colors.textMuted, fontFamily: Fonts.outfit, fontSize: 14 },
});
