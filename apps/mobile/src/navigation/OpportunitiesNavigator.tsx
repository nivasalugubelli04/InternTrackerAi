/**
 * Phase 8 — OpportunitiesNavigator
 *
 * Stack navigator wrapping Explore + detail screens.
 * This navigator is mounted as the "ExploreTab" in BottomTabNavigator.
 * OpportunityDetails is also accessible from the HomeTab stack (see AppRootNavigator).
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExploreScreen from '../screens/ExploreScreen';
import OpportunityDetailsScreen from '../screens/OpportunityDetailsScreen';

export type OpportunitiesStackParamList = {
  Explore: undefined;
  OpportunityDetails: { jobId: string };
};

const Stack = createNativeStackNavigator<OpportunitiesStackParamList>();

export default function OpportunitiesNavigator(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Explore" component={ExploreScreen} />
      <Stack.Screen
        name="OpportunityDetails"
        component={OpportunityDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
