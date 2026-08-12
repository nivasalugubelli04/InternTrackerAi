import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ApplicationDashboardScreen from '../screens/ApplicationDashboardScreen';
import ApplicationListScreen from '../screens/ApplicationListScreen';
import ApplicationDetailScreen from '../screens/ApplicationDetailScreen';

export type ApplicationsStackParamList = {
  ApplicationDashboard: undefined;
  ApplicationList: { status?: string };
  ApplicationDetail: { id: string };
};

const Stack = createNativeStackNavigator<ApplicationsStackParamList>();

export default function ApplicationsNavigator(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ApplicationDashboard" component={ApplicationDashboardScreen} />
      <Stack.Screen name="ApplicationList" component={ApplicationListScreen} />
      <Stack.Screen name="ApplicationDetail" component={ApplicationDetailScreen} />
    </Stack.Navigator>
  );
}
