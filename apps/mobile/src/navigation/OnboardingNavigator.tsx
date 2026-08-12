import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Colors } from '../theme';

// Import all onboarding screens
import Step1WelcomeScreen from '../screens/onboarding/Step1WelcomeScreen';
import Step2PersonalScreen from '../screens/onboarding/Step2PersonalScreen';
import Step3EducationScreen from '../screens/onboarding/Step3EducationScreen';
import Step4SkillsScreen from '../screens/onboarding/Step4SkillsScreen';
import Step5CareerScreen from '../screens/onboarding/Step5CareerScreen';
import Step6ResumeScreen from '../screens/onboarding/Step6ResumeScreen';
import Step7NotifScreen from '../screens/onboarding/Step7NotifScreen';
import Step8ReviewScreen from '../screens/onboarding/Step8ReviewScreen';

export type OnboardingStackParamList = {
  Step1Welcome: undefined;
  Step2Personal: undefined;
  Step3Education: undefined;
  Step4Skills: undefined;
  Step5Career: undefined;
  Step6Resume: undefined;
  Step7Notifications: undefined;
  Step8Review: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator(): React.ReactElement {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Step1Welcome" component={Step1WelcomeScreen} />
      <Stack.Screen name="Step2Personal" component={Step2PersonalScreen} />
      <Stack.Screen name="Step3Education" component={Step3EducationScreen} />
      <Stack.Screen name="Step4Skills" component={Step4SkillsScreen} />
      <Stack.Screen name="Step5Career" component={Step5CareerScreen} />
      <Stack.Screen name="Step6Resume" component={Step6ResumeScreen} />
      <Stack.Screen name="Step7Notifications" component={Step7NotifScreen} />
      <Stack.Screen name="Step8Review" component={Step8ReviewScreen} />
    </Stack.Navigator>
  );
}
