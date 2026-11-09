import { MoziLoadingScreen } from './MoziLoadingScreen'

interface PageLoaderProps {
  label?: string
  error?: string
  onRetry?: () => void
}

/** In-app loading for a page's data. Visibility follows the caller's real request state. */
export function PageLoader({ label, error, onRetry }: PageLoaderProps) {
  return <MoziLoadingScreen label={label} error={error} onRetry={onRetry} variant="page" />
}
