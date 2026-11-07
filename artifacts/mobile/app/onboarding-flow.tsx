import { router } from 'expo-router';
import { TutorialOverlay } from '@/components/TutorialOverlay';

/** Legacy storage key retained only for compatibility; profile.tutorialComplete is authoritative. */
export const ONBOARDING_FLOW_KEY = '@onboarding_flow_done';

export default function OnboardingFlowScreen() {
  return <TutorialOverlay onComplete={() => router.replace('/')} />;
}
