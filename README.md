# 게임 찍어내기 파이프라인 (Claude Code)

아이디어 한 줄(또는 "알아서 3개")을 넣으면 Claude Code 서브에이전트들이 **컨셉 → 설계(경제 시뮬) → 아트 → 사운드 → 모션 → 빌드 → QA 게이트**를 무인으로 돌려, 모바일에서 바로 플레이되는 **단일 HTML 게임**을 만들어 냅니다. 사람은 플레이하고 피드백만 줍니다.

- 품질 기준점: 로얄매치 · 앵그리버드 · 유튜브 광고 캐주얼 게임
- 재미 원칙: `docs/FUN_ENGINE.md` (§0 성장 경제 엔진 — 투자 vs 소비, 지수 사다리와 방법 전환, 구간마다 바뀌는 판단)
- 합격 기준: `docs/GAME_CONTRACT.md` · QA 게이트(기술·계약·봇 밸런스·비전·블라인드 3초 테스트)

## 시작하기

```bash
git clone https://github.com/junhee1219/game-pipeline.git && cd game-pipeline
claude
```
Claude Code 안에서:
```
/pipeline-onboarding     # 설치 + 키 확인 + 이미지·영상·음악·효과음 생성 방식을 말로 정해 저장
/make-game               # 알아서 3개  (또는: /make-game 우주 해적이 보물섬을 약탈하는 게임)
/game-feedback <id> 3판째부터 지루해, 보스 터질 때 손맛은 최고
/publish-game <id>       # (선택) 호스팅/아티팩트 MCP가 있으면 업로드, 없으면 로컬 파일
```
결과물: `games/<id>/dist/index.html` — 더블클릭으로 실행되는 파일 하나(엔진·코드·이미지·사운드 전부 인라인, ≤ 10MB).

### 필요한 것
- Node ≥ 20, Python ≥ 3.11, ffmpeg (`brew install ffmpeg`)
- 이미지 생성 수단: OpenAI API 키(기본) — `.env`에 직접 입력 (`.env.example` 참고). 키는 git에 올라가지 않습니다.
- (선택) 영상·음악: Playwright MCP 서버 + 브라우저에서 Gemini 계정 로그인 — 오브젝트 모션(몬스터 공격 등)과 게임 전용 BGM
- 효과음·기본 BGM: 저장소에 포함된 CC0 라이브러리(`tools/sound_lib`)로 키 없이 동작

## 구조
```
.claude/skills/   pipeline-onboarding · pipeline-setup · make-game · feedback · game-motion · game-bgm · publish-game
.claude/agents/   game-scout · designer · artist · sound · builder · qa · critic
docs/             FUN_ENGINE · GAME_CONTRACT · MOTION_GUIDE · PROVIDERS · EXISTING_GENRES
kit/              공통 런타임(Phaser 3 위: 연출·캔디 UI·표준 화면·오디오·저장·계측·테스트 API·애니메이션)
tools/            bundle · qa · gen_image · video_to_sprites · make_loop · sound_lib · setup
games/_sample/    kit 회귀 확인용 최소 게임
```
로컬 전용(git 미포함): `.env`(키), `.pipeline/providers.json`(생성 방식), `games/<id>/`(만든 게임), `games/REGISTRY.md`(중복 방지 목록), `inbox/`(수동 에셋).

## 라이선스 메모
- 폰트: Lilita One, Jua — SIL OFL 1.1 (`kit/fonts/OFL-*.txt`)
- 사운드 라이브러리: Kenney · OpenGameArt CC0 (`tools/sound_lib/README.md`에 출처)
- 생성 에셋(이미지·영상·음악)의 권리는 각 생성 서비스 약관을 따릅니다.
