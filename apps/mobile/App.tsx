import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from './src/screens/WelcomeScreen';

/**
 * App root — Phase 0 placeholder.
 *
 * Renders only the WelcomeScreen. Navigation (React Navigation) and
 * authentication flows will wrap this in Phase 1.
 */
export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <WelcomeScreen />
    </SafeAreaProvider>
  );
}
