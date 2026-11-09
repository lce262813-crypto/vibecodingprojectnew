import { MoziLoadingScreen } from '../components/MoziLoadingScreen'

interface AppLoadingScreenProps {
  message?: string
  error?: string
  onRetry?: () => void
}

/** Full-screen loading while the app starts (session check). The logo sits exactly where the
 *  boot screen in index.html draws it, so the hand-off from HTML to React does not jump. */
export function AppLoadingScreen({ message, error, onRetry }: AppLoadingScreenProps) {
  return <MoziLoadingScreen label={message} error={error} onRetry={onRetry} variant="full" />
}
