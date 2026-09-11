import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';

function TabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconActive]}>
      <Feather name={name as any} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.saffron,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => <View style={styles.tabBg} />,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => <TabIcon name="package" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Market',
          tabBarIcon: ({ color, focused }) => <TabIcon name="shopping-bag" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon name="user" color={color} focused={focused} />,
        }}
      />
      {/* Hidden screens within tabs stack */}
      <Tabs.Screen name="products/new" options={{ href: null }} />
      <Tabs.Screen name="products/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgDark2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    height: 70,
    paddingBottom: 10,
    paddingTop: 6,
  },
  tabBg: { flex: 1, backgroundColor: Colors.bgDark2 },
  tabLabel: { fontFamily: Fonts.outfitMedium, fontSize: 11, marginTop: 2 },
  iconWrapper: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  iconActive: { backgroundColor: 'rgba(249,115,22,0.15)' },
});
