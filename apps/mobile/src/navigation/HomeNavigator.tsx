/**
 * Phase 8 — HomeNavigator
 *
 * Stack navigator wrapping HomeScreen so that cards on the home screen
 * can navigate to OpportunityDetails.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import OpportunityDetailsScreen from '../screens/OpportunityDetailsScreen';

export type HomeStackParamList = {
  HomeMain: undefined;
  OpportunityDetails: { jobId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigator(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="OpportunityDetails"
        component={OpportunityDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
