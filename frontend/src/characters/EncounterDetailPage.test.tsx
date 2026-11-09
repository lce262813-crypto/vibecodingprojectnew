import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EncounterDetailPage } from './EncounterDetailPage'

describe('EncounterDetailPage', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the saved character before the titled original diary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      encounter_id: 'encounter-1',
      met_on: '2026-11-02',
      title: '너무 졸린 날',
      diary_text: '오늘 너무 졸린 것 같다. 너무 졸리다.',
      analysis: {
        analysis_mode: 'live', primary_emotion: 'fatigue',
        secondary_emotions: ['lethargy'], detail_states: [], energy: 18, keywords: [],
        event_summary: '피로가 크게 나타났어요.',
        display_emotions: [
          { key: 'fatigue', label: '피로', percentage: 85 },
          { key: 'lethargy', label: '무기력', percentage: 29 },
        ],
      },
      character: {
        character_id: 'character-1', encounter_id: 'encounter-1', name: '졸린이',
        fingerprint: 'fatigue:5:lethargy:none:1', primary_emotion: 'fatigue',
        intensity_level: 5, behavior_type: 'tired', accessory_part: 'cup',
        effect_parts: ['sleep'], feature_description: '피로의 표정을 담은 감정 몬스터예요.',
        is_new_character: false,
        appearance: {
          body_part: 'basic', palette: 'slate', color: '#B8B8C8',
          eyebrow_part: 'brow_flat', eye_part: 'eye_half', mouth_part: 'mouth_flat',
          mutation_part: null,
        },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    render(
      <MemoryRouter initialEntries={['/characters/character-1/encounters/encounter-1']}>
        <Routes>
          <Route path="/characters/:characterId/encounters/:encounterId" element={<EncounterDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('img', { name: '졸린이 character' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '너무 졸린 날' })).toBeInTheDocument()
    expect(screen.getByText('오늘 너무 졸린 것 같다. 너무 졸리다.')).toBeInTheDocument()
    expect(screen.queryByText('85%')).not.toBeInTheDocument()
  })
})
