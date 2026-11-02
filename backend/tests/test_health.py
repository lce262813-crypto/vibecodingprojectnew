from fastapi.testclient import TestClient

def test_health_check(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "mozi-api",
        "environment": "development",
    }


def test_cors_allows_phone_on_local_network_only(client: TestClient) -> None:
    def allowed(origin: str) -> bool:
        response = client.get("/api/health", headers={"Origin": origin})
        return response.headers.get("access-control-allow-origin") == origin

    assert allowed("http://localhost:5173")
    assert allowed("http://192.168.10.18:5173")
    assert allowed("http://10.0.0.5:5173")
    assert allowed("http://172.20.1.2:5173")
    assert not allowed("http://192.168.10.18:3000")
    assert not allowed("http://8.8.8.8:5173")
    assert not allowed("http://evil.example.com:5173")
