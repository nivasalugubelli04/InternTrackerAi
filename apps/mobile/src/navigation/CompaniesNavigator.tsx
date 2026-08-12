import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CompaniesHomeScreen from '../screens/CompaniesHomeScreen';
import CompanySearchScreen from '../screens/CompanySearchScreen';
import CompanyDetailsScreen from '../screens/CompanyDetailsScreen';
import TrackedCompaniesScreen from '../screens/TrackedCompaniesScreen';

export type CompaniesStackParamList = {
  CompaniesHome: undefined;
  CompanySearch: undefined;
  CompanyDetails: { companyId: string; companyName: string };
  TrackedCompanies: undefined;
};

const Stack = createNativeStackNavigator<CompaniesStackParamList>();

export default function CompaniesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompaniesHome" component={CompaniesHomeScreen} />
      <Stack.Screen name="CompanySearch" component={CompanySearchScreen} />
      <Stack.Screen name="CompanyDetails" component={CompanyDetailsScreen} />
      <Stack.Screen name="TrackedCompanies" component={TrackedCompaniesScreen} />
    </Stack.Navigator>
  );
}
