import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { GuestRoute } from './auth/GuestRoute'
import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { SignupPage } from './auth/SignupPage'
import { LandingPage } from './pages/LandingPage'
import { CollectionPage } from './characters/CollectionPage'
import { CharacterDetailPage } from './characters/CharacterDetailPage'
import { EncounterDetailPage } from './characters/EncounterDetailPage'
import { CharacterPrototypePage } from './characters/prototype/CharacterPrototypePage'
import { BodyPrototypePage } from './characters/prototype/BodyPrototypePage'
import { AppShell } from './components/AppShell'
import { DiaryPage } from './diary/DiaryPage'
import { DiaryRecordsPage } from './diary/DiaryRecordsPage'
import { GenerationPage } from './diary/GenerationPage'
import { RoomPage } from './room/RoomPage'
import { ResidentManagerPage } from './room/ResidentManagerPage'
import { SettingsPage } from './settings/SettingsPage'
import { PublicCharacterPage } from './sharing/PublicCharacterPage'
import { ShopPage } from './shop/ShopPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/share/:token" element={<PublicCharacterPage />} />
        <Route path="/prototype/characters" element={<BodyPrototypePage />} />
        <Route path="/prototype/characters/gallery" element={<CharacterPrototypePage />} />
        <Route
          path="/signup"
          element={<GuestRoute><SignupPage /></GuestRoute>}
        />
        <Route
          path="/login"
          element={<GuestRoute><LoginPage /></GuestRoute>}
        />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/room" element={<RoomPage />} />
          <Route path="/room/manage" element={<ResidentManagerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/diary/generating" element={<GenerationPage />} />
          <Route path="/diary/records" element={<DiaryRecordsPage />} />
          <Route path="/characters" element={<CollectionPage />} />
          <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
          <Route path="/characters/:characterId/encounters/:encounterId" element={<EncounterDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
