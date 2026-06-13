/*
 * Purpose: Expo entry point; registers the root App component so it works in
 *          both Expo Go and native builds.
 * Inputs:  None.
 * Outputs: None (side-effect: registers the component with the native host).
 */
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
