def confirm_entry(client, data, emotion=None):
    """Character generation now happens automatically after a valid AI result."""
    if data.get("status") in ("completed", "uncertain") and (data.get("character") or data.get("status") == "uncertain"):
        class Completed:
            def json(self):
                return data
        return Completed()
    assert data["status"] == "awaiting_confirmation", data
    review = data["analysis"]["review"]
    selected = emotion or review["selected_emotion"]
    if selected is None:
        # Simulates a user choosing their own feeling; never an AI fallback.
        selected = "calm"
        response = client.patch(f"/api/diary/entries/{data['entry_id']}/review", json={
            "revision": data["analysis"]["review_revision"],
            "emotions": [{"emotion": selected, "intensity": 2}],
            "relationship": {"type": "SINGLE", "sequence": [], "explanation": "내가 직접 고른 마음이에요."},
            "selected_emotion": selected,
        })
        assert response.status_code == 200, response.text
        data = response.json()
    response = client.post(f"/api/diary/entries/{data['entry_id']}/confirm", json={
        "revision": data["analysis"]["review_revision"], "selected_emotion": selected,
    })
    assert response.status_code == 200, response.text
    return response
