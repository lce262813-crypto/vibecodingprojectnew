from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User

SIGNUP_PAYLOAD = {
    "email": "mozi@example.com",
    "password": "safe-password",
    "nickname": "모지",
}


def signup(client: TestClient, **overrides: str):
    payload = {**SIGNUP_PAYLOAD, **overrides}
    return client.post("/api/auth/signup", json=payload)


def test_signup_preflight_accepts_local_frontend_aliases(client: TestClient) -> None:
    for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        response = client.options(
            "/api/auth/signup",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin
        assert response.headers["access-control-allow-credentials"] == "true"


def login(client: TestClient, **overrides: str):
    payload = {
        "email": SIGNUP_PAYLOAD["email"],
        "password": SIGNUP_PAYLOAD["password"],
        **overrides,
    }
    return client.post("/api/auth/login", json=payload)


def test_signup_hashes_password(client: TestClient, db_session: Session) -> None:
    response = signup(client)

    assert response.status_code == 201
    assert response.json()["message"] == "회원가입이 완료되었습니다. 로그인해 주세요."

    user = db_session.scalar(select(User).where(User.email == SIGNUP_PAYLOAD["email"]))
    assert user is not None
    assert user.password_hash != SIGNUP_PAYLOAD["password"]
    assert SIGNUP_PAYLOAD["password"] not in user.password_hash


def test_signup_rejects_duplicate_email_and_nickname(client: TestClient) -> None:
    assert signup(client).status_code == 201

    duplicate_email = signup(client, nickname="다른닉네임")
    duplicate_nickname = signup(client, email="other@example.com")

    assert duplicate_email.status_code == 409
    assert duplicate_email.json()["detail"] == "이미 사용 중인 이메일입니다."
    assert duplicate_nickname.status_code == 409
    assert duplicate_nickname.json()["detail"] == "이미 사용 중인 닉네임입니다."


def test_signup_validates_password_and_nickname_boundaries(client: TestClient) -> None:
    assert signup(client, password="1234567").status_code == 422
    assert signup(client, password="a" * 65).status_code == 422
    assert signup(client, nickname="").status_code == 422
    assert signup(client, nickname="한").status_code == 201
    assert signup(client, nickname="잘못된 닉네임").status_code == 422


def test_login_session_me_and_logout(client: TestClient) -> None:
    signup(client)

    response = login(client)

    assert response.status_code == 200
    assert response.json()["nickname"] == SIGNUP_PAYLOAD["nickname"]
    assert "httponly" in response.headers["set-cookie"].lower()

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == SIGNUP_PAYLOAD["email"]

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_login_uses_generic_error(client: TestClient) -> None:
    signup(client)

    wrong_password = login(client, password="wrong-password")
    missing_user = login(client, email="missing@example.com")

    assert wrong_password.status_code == 401
    assert missing_user.status_code == 401
    assert wrong_password.json() == missing_user.json()


def test_nickname_update_requires_auth_and_enforces_uniqueness(
    client: TestClient,
) -> None:
    assert (
        client.patch("/api/account/nickname", json={"nickname": "새이름"}).status_code
        == 401
    )

    signup(client)
    login(client)
    updated = client.patch("/api/account/nickname", json={"nickname": "새이름"})

    assert updated.status_code == 200
    assert updated.json()["nickname"] == "새이름"
    assert client.get("/api/auth/me").json()["nickname"] == "새이름"


def test_account_export_excludes_credentials_and_account_can_be_deleted(
    client: TestClient,
) -> None:
    signup(client)
    login(client)
    client.post(
        "/api/diary/today",
        json={"title": "내보낼 일기", "diary_text": "내 데이터 내보내기를 검증하는 충분히 긴 일기다."},
    )

    exported = client.get("/api/account/export")
    assert exported.status_code == 200
    assert exported.json()["profile"]["email"] == SIGNUP_PAYLOAD["email"]
    assert exported.json()["diaries"][0]["title"] == "내보낼 일기"
    assert "password" not in str(exported.json()).lower()

    wrong = client.request(
        "DELETE", "/api/account", json={"password": "wrong-password"}
    )
    assert wrong.status_code == 403
    deleted = client.request(
        "DELETE", "/api/account", json={"password": SIGNUP_PAYLOAD["password"]}
    )
    assert deleted.status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    assert login(client).status_code == 401


def sign_in(client: TestClient):
    return client.post(
        "/api/auth/login",
        json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
    )


def test_new_account_starts_the_tutorial_and_resumes_after_logging_in_again(client: TestClient) -> None:
    signup(client)
    first = sign_in(client).json()
    assert first["tutorial_completed"] is False
    assert first["tutorial_step"] == 0

    assert client.put("/api/auth/tutorial/step", json={"step": 2}).json()["tutorial_step"] == 2
    client.post("/api/auth/logout")

    resumed = sign_in(client).json()
    assert resumed["tutorial_completed"] is False
    assert resumed["tutorial_step"] == 2


def test_tutorial_step_must_be_one_of_the_five_steps(client: TestClient) -> None:
    signup(client)
    sign_in(client)

    assert client.put("/api/auth/tutorial/step", json={"step": 5}).status_code == 422
    assert client.put("/api/auth/tutorial/step", json={"step": -1}).status_code == 422


def test_finished_tutorial_stays_finished_on_any_session_without_coins(
    client: TestClient, db_session: Session
) -> None:
    signup(client)
    sign_in(client)

    assert client.post("/api/auth/tutorial/complete").json()["tutorial_completed"] is True
    client.post("/api/auth/logout")

    # A later login stands in for another device: the state comes from the account.
    assert sign_in(client).json()["tutorial_completed"] is True
    assert client.post("/api/auth/tutorial/complete").status_code == 200
    user = db_session.scalar(select(User).where(User.email == SIGNUP_PAYLOAD["email"]))
    assert user is not None
    assert user.coins == 0


def test_tutorial_requires_login(client: TestClient) -> None:
    assert client.post("/api/auth/tutorial/complete").status_code == 401
    assert client.put("/api/auth/tutorial/step", json={"step": 1}).status_code == 401
