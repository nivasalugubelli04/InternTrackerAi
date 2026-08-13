import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthContext } from '../context/AuthContext';
import { Colors } from '../theme';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MockInterviewScreen from '../screens/ai/MockInterviewScreen';
import ResumeBuilderScreen from '../screens/resume-builder/ResumeBuilderScreen';
import { profileApi } from '../services/profile.service';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  App: undefined;
  Main: undefined;
  MockInterview: undefined;
  ResumeBuilder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (isAuthenticated) {
      setCheckingProfile(true);
      profileApi.get()
        .then((profile) => {
          if (mounted) setOnboardingComplete(!!profile?.onboardingCompletedAt);
        })
        .catch(() => {
          if (mounted) setOnboardingComplete(false);
        })
        .finally(() => {
          if (mounted) setCheckingProfile(false);
        });
    } else {
      if (mounted) setCheckingProfile(false);
    }
    return () => { mounted = false; };
  }, [isAuthenticated]);

  if (isLoading || checkingProfile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.brand.purple} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !onboardingComplete ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          
          <Stack.Screen 
            name="MockInterview" 
            component={MockInterviewScreen} 
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen 
            name="ResumeBuilder" 
            component={ResumeBuilderScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
