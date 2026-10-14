import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/types/navigation';
import { COLORS } from './src/constants/theme';

// Screens
import { LandingScreen } from './src/screens/LandingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { CreateChoiceScreen } from './src/screens/CreateChoiceScreen';
import { CreateManualAssessmentScreen } from './src/screens/CreateManualAssessmentScreen';
import { CreateAssessmentScreen } from './src/screens/CreateAssessmentScreen';
import { ReviewExtractionScreen } from './src/screens/ReviewExtractionScreen';
import { TestRunnerScreen } from './src/screens/TestRunnerScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { AdminPortalScreen } from './src/screens/AdminPortalScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="CreateChoice" component={CreateChoiceScreen} />
        <Stack.Screen
          name="CreateManual"
          component={CreateManualAssessmentScreen}
        />
        <Stack.Screen
          name="CreateAssessment"
          component={CreateAssessmentScreen}
        />
        <Stack.Screen
          name="ReviewExtraction"
          component={ReviewExtractionScreen}
        />
        <Stack.Screen
          name="TestRunner"
          component={TestRunnerScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="AdminPortal"
          component={AdminPortalScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
