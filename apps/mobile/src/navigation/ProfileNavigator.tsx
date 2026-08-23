import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Colors } from '../theme';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ManageSkillsScreen from '../screens/ManageSkillsScreen';
import ManageResumeScreen from '../screens/ManageResumeScreen';
import ManagePreferencesScreen from '../screens/ManagePreferencesScreen';
import PortfolioIntelligenceScreen from '../screens/ai/PortfolioIntelligenceScreen';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  ManageSkills: undefined;
  ManageResume: undefined;
  ManagePreferences: undefined;
  PortfolioIntelligence: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator(): React.ReactElement {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background.primary },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: Colors.background.primary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="ManageSkills"
        component={ManageSkillsScreen}
        options={{ title: 'Manage Skills' }}
      />
      <Stack.Screen
        name="ManageResume"
        component={ManageResumeScreen}
        options={{ title: 'Manage Resume' }}
      />
      <Stack.Screen
        name="ManagePreferences"
        component={ManagePreferencesScreen}
        options={{ title: 'Preferences' }}
      />
      <Stack.Screen
        name="PortfolioIntelligence"
        component={PortfolioIntelligenceScreen}
        options={{ title: 'Portfolio Intelligence' }}
      />
    </Stack.Navigator>
  );
}
