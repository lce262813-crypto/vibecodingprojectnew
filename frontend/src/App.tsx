import { ConceptDemoPage } from './characters/concepts/ConceptDemoPage'
import { FriendDemoPage } from './characters/concepts/FriendDemoPage'
import { HiResDemoPage } from './characters/concepts/HiResDemoPage'
import { ItemDemoPage } from './characters/concepts/ItemDemoPage'
import { WalkerDemoPage } from './characters/concepts/WalkerDemoPage'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { GuestRoute } from './auth/GuestRoute'
import { LoginPage } from './auth/LoginPage'
import { OnboardingPage } from './auth/OnboardingPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { SignupPage } from './auth/SignupPage'
import { LandingPage } from './pages/LandingPage'
import { MobilePreviewPage } from './pages/MobilePreviewPage'
import { CollectionPage } from './characters/CollectionPage'
import { CharacterDetailPage } from './characters/CharacterDetailPage'
import { EncounterDetailPage } from './characters/EncounterDetailPage'
import { CharacterPrototypePage } from './characters/prototype/CharacterPrototypePage'
import { BodyPrototypePage } from './characters/prototype/BodyPrototypePage'
import { PixelRendererDemoPage } from './characters/prototype/PixelRendererDemoPage'
import { HumanCharacterDemoPage } from './characters/prototype/HumanCharacterDemoPage'
import { AppShell } from './components/AppShell'
import { DiaryPage } from './diary/DiaryPage'
import { DiaryEntryDetailPage } from './diary/DiaryEntryDetailPage'
import { DiaryRecordsPage } from './diary/DiaryRecordsPage'
import { GenerationPage } from './diary/GenerationPage'
import { RoomPage } from './room/RoomPage'
import { ResidentManagerPage } from './room/ResidentManagerPage'
import { SettingsPage } from './settings/SettingsPage'
import { PublicCharacterPage } from './sharing/PublicCharacterPage'
import { ShopPage } from './shop/ShopPage'
import { EmotionReportPage } from './reports/EmotionReportPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/mobile-preview" element={<MobilePreviewPage />} />
        <Route path="/share/:token" element={<PublicCharacterPage />} />
        <Route path="/prototype/characters" element={<BodyPrototypePage />} />
        <Route path="/prototype/characters/gallery" element={<CharacterPrototypePage />} />
        <Route path="/prototype/characters/pixel" element={<PixelRendererDemoPage />} />
        <Route path="/prototype/characters/human" element={<HumanCharacterDemoPage />} />
        <Route path="/prototype/characters/concepts" element={<ConceptDemoPage />} />
        <Route path="/prototype/characters/walkers" element={<WalkerDemoPage />} />
        <Route path="/prototype/characters/friends" element={<FriendDemoPage />} />
        <Route path="/prototype/characters/hires" element={<HiResDemoPage />} />
        <Route path="/prototype/characters/colors" element={<FriendDemoPage soft />} />
        <Route path="/prototype/characters/items" element={<ItemDemoPage />} />
        <Route path="/character-workshop" element={<HumanCharacterDemoPage />} />
        <Route
          path="/signup"
          element={<GuestRoute><SignupPage /></GuestRoute>}
        />
        <Route
          path="/login"
          element={<GuestRoute><LoginPage /></GuestRoute>}
        />
        <Route path="/welcome" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/room" element={<RoomPage />} />
          <Route path="/room/manage" element={<ResidentManagerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/diary/generating" element={<GenerationPage />} />
          <Route path="/diary/records" element={<DiaryRecordsPage />} />
          <Route path="/diary/entries/:entryId" element={<DiaryEntryDetailPage />} />
          <Route path="/characters" element={<CollectionPage />} />
          <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
          <Route path="/reports" element={<EmotionReportPage />} />
          <Route path="/characters/:characterId/encounters/:encounterId" element={<EncounterDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
