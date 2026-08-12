import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';

import { Colors, Typography } from '../theme';
import HomeNavigator from './HomeNavigator';
import OpportunitiesNavigator from './OpportunitiesNavigator';
import SavedOpportunitiesScreen from '../screens/SavedOpportunitiesScreen';
import ProfileNavigator from './ProfileNavigator';
import CompaniesNavigator from './CompaniesNavigator';
import ApplicationsNavigator from './ApplicationsNavigator';

export type BottomTabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  TrackerTab: undefined;
  SavedTab: undefined;
  CompaniesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabIcon = ({ name, color }: { name: string; color: string }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 20, color }}>{name}</Text>
  </View>
);

export default function BottomTabNavigator(): React.ReactElement {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background.secondary,
          borderTopColor: Colors.border.subtle,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: Colors.brand.purple,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.medium,
          marginTop: -2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={OpportunitiesNavigator}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabIcon name="🔍" color={color} />,
        }}
      />
      <Tab.Screen
        name="TrackerTab"
        component={ApplicationsNavigator}
        options={{
          title: 'Tracker',
          tabBarIcon: ({ color }) => <TabIcon name="📊" color={color} />,
        }}
      />
      <Tab.Screen
        name="SavedTab"
        component={SavedOpportunitiesScreen}
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <TabIcon name="♥" color={color} />,
        }}
      />
      <Tab.Screen
        name="CompaniesTab"
        component={CompaniesNavigator}
        options={{
          title: 'Companies',
          tabBarIcon: ({ color }) => <TabIcon name="🏢" color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
