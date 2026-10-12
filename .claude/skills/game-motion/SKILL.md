---
name: game-motion
description: 게임 오브젝트 모션을 Gemini 웹 영상 생성(Playwright, 로그인 세션)으로 만들어 투명 스프라이트 시트로 변환하고 manifest sheets에 등록한다. 적 공격·피격·캐릭터 액션·보상 공개 등. "/game-motion <id> [key...]", "이 몬스터 공격 모션 만들어줘"에 사용.
argument-hint: <id> [모션 키 ...]
---

# /game-motion — 오케스트레이터 직접 수행 (브라우저 세션은 하나라 서브에이전트에 맡기지 마라)

생성 수단: `.pipeline/providers.json`의 `video`. `gemini-web`이면 아래 절차, `veo-api`면 API 어댑터, `manual`이면 `inbox/<id>/WANTED.md`에 첫 프레임 PNG·프롬프트를 내보내고 들어온 mp4를 5단계부터 처리, `skip`이면 아무것도 안 함(빌더의 대체 모션 유지).

입력: `<id>` + 선택적으로 만들 모션 키. 없으면 `games/<id>/GDD.md`의 `## 모션` 표에서 아직 `assets/anim/<key>.webp`가 없는 것을 우선순위 순으로.
기준 문서: `docs/MOTION_GUIDE.md`(우선순위·프롬프트 템플릿·처리).

## 절차 (키마다)
1. **첫 프레임**: 원본 스프라이트(`games/<id>/assets/img/<src>.png`)를 1280×720 흰 배경 캔버스 중앙에 얹은 PNG를 Playwright가 읽을 수 있는 곳(예: `~/.playwright-mcp/veo/`)에 저장(.venv Pillow). 튀어나가는 동작이면 그 방향 여백.
2. **Gemini**: Playwright MCP로 `https://gemini.google.com/app` → `업로드 및 도구` → `동영상 만들기` → `파일 업로드`(첫 프레임) → MOTION_GUIDE §3 템플릿 프롬프트 입력·제출.
   - 로그인 안 돼 있으면 사용자에게 Playwright 창에서 로그인을 요청하고 기다린다.
   - 업로드 권리 확인 창이 뜨면 우리가 만든 에셋일 때만 '동의'.
   - "오늘 생성할 수 있는 동영상 N개 남음"을 읽어 남은 한도를 기록. 0이면 중단하고 남은 키를 보고.
3. **대기·다운로드**: 페이지에 `video` 요소가 생길 때까지(최대 ~4분) 기다린 뒤, 페이지 안에서 `fetch(video.currentSrc,{credentials:'include'})` → base64 → `browser_evaluate(filename=…)`로 저장 → 디코드해 mp4로.
4. **검수**: 프레임 4–6장을 이어 붙여 직접 본다. 그림체가 원본과 다르면(3D화 등) 같은 대화에서 "Use MY uploaded image as the exact first frame … Do NOT turn it into 3D"를 다시 강하게 요구해 재생성(한도 고려).
5. **변환**: `.venv/bin/python tools/video_to_sprites.py <mp4> games/<id>/assets/anim/<key> --fps 12 --max 300 --loop <auto|none> [--start --end]`. 미리보기(어두운 배경 합성)로 잘림·잔상 확인.
6. **등록**: `games/<id>/manifest.json`의 `sheets`에 `{ "key", "file": "assets/anim/<key>.webp", "meta": "assets/anim/<key>.json" }` 추가(쓰기 직전 다시 읽기). 원본 mp4는 `assets/anim/<key>_src.mp4`(git 미추적).
7. 빌더가 이미 `Kit.animSet`으로 클립을 연결해 두었다면 재번들만으로 반영된다. 아니면 builder에게 연결을 지시.
8. 번들 용량(≤ 10MB) 확인. 넘으면 `--fps 10 --max 240`으로 재변환.

보고: 만든 키, 남은 한도, 대체 모션으로 남은 키.
