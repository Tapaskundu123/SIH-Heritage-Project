import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { Colors } from '../constants/theme';
import PipelineBanner from '../components/PipelineBanner';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.bgDark }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bgDark },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="voice-cataloger" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ai-studio" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pricing" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="inventory" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <PipelineBanner />
    </>
  );
}
