---
name: pipeline-setup
description: 게임 찍어내기 파이프라인 첫 설치·점검. 의존성(npm, Playwright 브라우저, Python venv, ffmpeg) 설치, .env 키 확인, kit 샘플 번들·QA로 동작 검증. 저장소를 처음 clone했거나 "/pipeline-setup", "파이프라인 설치", "세팅해줘"에 사용.
---

# /pipeline-setup

저장소 루트에서 실행한다.

1. **도구 확인**: `node -v`(≥ 20), `python3 --version`(≥ 3.11), `ffmpeg -version`. ffmpeg가 없으면 설치 방법을 안내한다(macOS: `brew install ffmpeg`) — 사용자 확인 없이 시스템 패키지를 설치하지 마라.
2. **설치**: `bash tools/setup.sh` (npm ci, Playwright chromium, `.venv` + `requirements.txt`). 실패하면 출력의 마지막 오류를 보여주고 원인을 설명한다.
3. **키**: `.env`가 없으면 `.env.example`을 복사해 만들고, 사용자에게 `OPENAI_API_KEY`를 `.env`에 넣어 달라고 요청한다. **키 값을 대화에 붙여 달라고 하지 말고**, 파일에 직접 넣게 안내한다(이미 붙여 넣었다면 `.env`에 저장하고 키 교체를 권한다). 확인은 `python3 tools/check_env.py`(값을 출력하지 않고 존재·모델 접근만 검사).
4. **검증**: `node tools/bundle.mjs _sample && node tools/qa/run.mjs _sample --bot-seconds=8` — L1(부팅·FPS·이어하기·결과 화면)이 통과하면 성공. 샘플은 에셋이 적어 SFX·티어 항목 미달은 정상.
5. **선택 기능 안내**:
   - 영상 모션·시그니처 BGM: Playwright MCP 서버가 연결돼 있어야 하고, 첫 사용 시 열리는 브라우저에서 Google(Gemini) 계정으로 로그인한다(`/game-motion`, `/game-bgm`).
   - 배포: `/publish-game` — 아티팩트/호스팅 MCP가 있으면 사용, 없으면 로컬 파일.
6. 결과 요약: 통과한 단계, 남은 할 일(키 입력 등), 다음 명령 `/make-game`.
