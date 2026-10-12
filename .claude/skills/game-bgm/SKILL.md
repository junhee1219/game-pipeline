---
name: game-bgm
description: 게임 세계관 전용 BGM을 Gemini 웹 '음악 만들기'(Playwright, 로그인 세션)로 생성해 이음새 없는 64초 루프로 만들어 넣는다. "/game-bgm <id> [lobby|play|tension]", "이 게임 BGM 새로 만들어줘"에 사용.
argument-hint: <id> [bgm 키 — 기본 play]
---

# /game-bgm — 오케스트레이터 직접 수행

생성 수단: `.pipeline/providers.json`의 `music`. `gemini-web`이면 아래, `cc0-library`/`skip`이면 아무것도 안 함(라이브러리 BGM 유지), `manual`이면 프롬프트를 `inbox/<id>/WANTED.md`로 내보내고 들어온 파일을 5단계부터 처리.

1. `games/<id>/GDD.md`의 세계관·사운드 맵을 읽고 프롬프트를 쓴다: "Instrumental background music for <세계관 한 줄> mobile game (Royal Match polish). <분위기>: <악기 4–6개>. <BPM> BPM, <조성>. Must loop seamlessly for long play sessions: no intro build-up, no ending, no fade-out, steady energy throughout. No vocals, no lyrics."
2. Playwright MCP로 gemini.google.com → `업로드 및 도구` → `음악 만들기` → 프롬프트 제출. 로그인 필요 시 사용자에게 요청.
3. 결과 페이지의 `video` 요소(음악도 video로 렌더됨)가 duration > 5초가 될 때까지 대기(최대 ~4분). "encountered an issue"면 짧게 다시 요청(1회).
4. 페이지 안 fetch → base64 → `browser_evaluate(filename=…)` → mp4로 디코드.
5. `.venv/bin/python tools/make_loop.py <mp4> games/<id>/assets/audio/<bgm 키>.mp3 --start 20 --len 64 --xfade 2` (기존 파일은 `games/<id>/build/`에 백업).
6. manifest의 해당 audio 항목 `source`를 "Gemini 음악 만들기 — <설명>, make_loop 64초"로, `license`를 "Gemini 생성물"로 갱신(쓰기 직전 다시 읽기).
7. 재번들 → QA L1 확인.
