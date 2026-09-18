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
import { useOnboardingPipeline } from '../../constants/pipeline';

export default function LoginScreen() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      if (res.data.success) {
        await AsyncStorage.setItem('ks_token', res.data.data.token);
        await AsyncStorage.setItem('ks_user', JSON.stringify(res.data.data.user));
        // Start full onboarding pipeline starting at AI Studio (Step 1)
        await pipeline.startOnboarding();
        router.replace('/ai-studio');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bgDark }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['rgba(249,115,22,0.08)', 'transparent']} style={styles.topGlow} />

        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoRow}>
          <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.logoBox}>
            <Text style={styles.logoLetters}>KS</Text>
          </LinearGradient>
          <Text style={styles.logoText}>Karigar<Text style={{ color: Colors.saffron }}>Setu</Text></Text>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your artisan account</Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="artisan@example.com"
                placeholderTextColor={Colors.textDim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={16} color={Colors.textDim} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <GradientButton title="Sign In" onPress={handleLogin} loading={loading} style={{ marginTop: Spacing.md }} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerBtnText}>
              New to KarigarSetu?{' '}
              <Text style={{ color: Colors.saffron }}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.bgDark, paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  backBtn: { marginTop: Platform.OS === 'ios' ? 56 : 36, marginBottom: Spacing.lg, width: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.xl },
  logoBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoLetters: { color: '#fff', fontFamily: Fonts.outfitBold, fontSize: 14 },
  logoText: { fontSize: 20, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  title: { fontSize: 28, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, fontFamily: Fonts.outfit, marginBottom: Spacing.xl },
  form: { gap: Spacing.xs },
  inputGroup: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, fontFamily: Fonts.outfitMedium, fontSize: 13, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 12 },
  inputIcon: { marginRight: 10 },
  input: { color: Colors.textPrimary, fontFamily: Fonts.outfit, fontSize: 15, paddingVertical: 14, flex: 1 },
  eyeBtn: { padding: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
  dividerText: { color: Colors.textDim, fontFamily: Fonts.outfit, fontSize: 13 },
  registerBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  registerBtnText: { color: Colors.textMuted, fontFamily: Fonts.outfit, fontSize: 14 },
});
