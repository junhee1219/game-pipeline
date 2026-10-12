# 게임 찍어내기 파이프라인

Claude Code 세션이 **아이디어 한 줄(또는 "알아서 3개") → 프로덕션급 단일 HTML 게임**을 무인으로 찍어낸다. 사람은 플레이하고 피드백만 준다. 사용법은 `README.md`.

- 재미 원칙: `docs/FUN_ENGINE.md` — **§0 성장 경제 엔진이 1순위**(투자 vs 소비 · 지수 사다리와 방법 전환 · 구간마다 바뀌는 판단)
- 합격 기준: `docs/GAME_CONTRACT.md` · 모션: `docs/MOTION_GUIDE.md` · 생성 수단: `docs/PROVIDERS.md`
- 품질 기준점: 앵그리버드 · 로얄매치 · 유튜브 광고 캐주얼 게임. **하한선은 바닥이지 목표가 아니다.**

## 스킬 라우팅
- 처음 설치·생성 방식 설정 → `/pipeline-onboarding` (설치는 `/pipeline-setup`을 내부에서 수행)
- 새 게임 → `/make-game [아이디어]`
- 플레이 피드백 → `/game-feedback <id> <피드백>`
- 오브젝트 모션 → `/game-motion <id>` · 시그니처 BGM → `/game-bgm <id>` (오케스트레이터 직접, 브라우저 세션)
- 배포(선택) → `/publish-game <id>`

## 규칙
- 비밀은 `.env`에만. 코드·문서·커밋·providers.json·대화 출력에 키 금지. 사용자에게 키를 대화에 붙여 달라고 하지 말 것.
- 만든 게임(`games/<id>/`), 레지스트리, providers.json, inbox는 **로컬 전용** — 커밋하지 않는다. 커밋 대상은 파이프라인(kit·tools·docs·.claude)과 `games/_sample`뿐.
- 피드백에서 모든 게임에 해당하는 교훈이 나오면 `docs/`·`.claude/agents/`의 원칙으로 올린다(게임 하나만 고치고 끝내지 않는다).
- kit 변경 시 `node tools/bundle.mjs _sample && node tools/qa/run.mjs _sample`로 회귀 확인.
- Python은 `.venv/bin/python`. Node 패키지: phaser, playwright.
- 블라인드 3초 테스트 통과 전 배포 금지.
