---
name: pipeline-onboarding
description: 이미지·영상·음악·효과음을 각각 어떤 수단으로 생성할지 사용자에게 자연어로 묻고, 실제로 쓸 수 있는지 확인한 뒤 .pipeline/providers.json에 저장한다. 파이프라인 각 단계가 이 설정을 꺼내 쓴다. 처음 설치 후, 또는 "생성 방식 바꿀래", "/pipeline-onboarding"에 사용.
---

# /pipeline-onboarding

목표: 사용자가 **말로** 정한 생성 방식을 `.pipeline/providers.json`(git 미포함)에 구조화해 저장. 수단별 상세는 `docs/PROVIDERS.md`.

## 진행
0. **설치 먼저**: `node_modules/`나 `.venv/`가 없으면 `/pipeline-setup` 절차(= `bash tools/setup.sh` + 샘플 QA)를 먼저 수행한다. 즉 clone 직후엔 이 스킬 하나로 설치와 설정이 끝난다.
1. 기존 `.pipeline/providers.json`이 있으면 요약해 보여주고 "바꿀 것만 말해 달라"고 한다.
2. 네 가지를 **한 번에 하나씩, 자연어로** 묻는다. 선택지를 강요하지 말고 예시만 준다(사용자가 자유롭게 말하게):
   - **이미지**: "게임 그림은 어떻게 만들까요? 예) OpenAI 키로 gpt-image(모델·퀄리티), 내가 웹에서 직접 만들어 넣기 …"
   - **영상**(오브젝트 모션): "몬스터 공격·캐릭터 동작 같은 움직임은요? 예) Gemini 웹에 내 계정 로그인, Gemini API 키, 안 씀(코드 모션만) …"
   - **음악**(BGM): "배경음악은요? 예) Gemini 음악 만들기, 무료 CC0 라이브러리, ElevenLabs 키 …"
   - **효과음**: "효과음은요? 예) 무료 CC0 라이브러리, ElevenLabs 키, 직접 …"
3. 답을 `docs/PROVIDERS.md`의 method로 매핑하고, 애매하면 한 번만 되묻는다. 사용자의 말은 `said`에 원문 그대로 보존.
4. **실제 가능 여부 확인**(값은 출력하지 않음):
   - API 방식: `.env`에 해당 키가 있는지(`python3 tools/check_env.py`, 필요 시 키 이름 추가 확인). 없으면 `.env`에 직접 넣어 달라고 안내 — 키를 대화에 붙여 달라고 하지 마라.
   - `gemini-web`: Playwright MCP가 연결돼 있는지, gemini.google.com을 열어 로그인 상태인지(아니면 Playwright 창에서 로그인 요청 후 대기).
   - `cc0-library`: `tools/sound_lib/index.json` 존재.
   - `manual`: `inbox/` 폴더를 만들고 사용법 한 줄.
   확인 실패한 항목은 저장하되 `"verified": false`와 이유를 남긴다.
5. `.pipeline/providers.json` 저장(형식은 PROVIDERS.md). `updated`는 오늘 날짜.
6. 요약 표(능력 · 방식 · 확인 결과)와 다음 명령(`/make-game`)을 보여준다.

## 규칙
- 키·토큰·비밀번호는 절대 providers.json에 쓰지 않는다(`.env`만).
- 이미 정해진 걸 다시 묻지 않는다. 사용자가 "다 기본으로"라고 하면 기본값: 이미지 openai-api(gpt-image-2.5-sunburst, low, 히어로 medium) · 영상 gemini-web · 음악 gemini-web(fallback cc0-library) · 효과음 cc0-library.
