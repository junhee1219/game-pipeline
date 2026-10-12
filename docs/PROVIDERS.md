# PROVIDERS — 생성 수단별 사용법

파이프라인은 4가지 생성을 **각자의 설정**대로 수행한다. 설정은 `/pipeline-onboarding`이 자연어로 받아 `.pipeline/providers.json`(로컬, git 미포함)에 저장하고, 각 단계가 꺼내 쓴다.

| 능력 | 쓰는 곳 | 설정 키 |
|---|---|---|
| 이미지 | game-artist (스프라이트·배경·UI) | `image` |
| 영상 | `/game-motion` (오브젝트 모션 → 스프라이트 시트) | `video` |
| 음악 | `/game-bgm` (시그니처 BGM) · game-sound (BGM 선택) | `music` |
| 효과음 | game-sound (SFX) | `sfx` |

## 설정 파일 형식 (`.pipeline/providers.json`)
```json
{
  "version": 1,
  "updated": "2026-10-08",
  "image": { "method": "openai-api", "model": "gpt-image-2.5-sunburst", "quality": "low", "hero_quality": "medium", "said": "OpenAI 키로 sunburst low, 로고·배경만 medium" },
  "video": { "method": "gemini-web", "daily_limit_hint": 3, "said": "Gemini 웹에 내 계정으로 로그인해서" },
  "music": { "method": "gemini-web", "fallback": "cc0-library", "said": "BGM은 Gemini 음악, 안 되면 무료 라이브러리" },
  "sfx":   { "method": "cc0-library", "said": "효과음은 무료 라이브러리면 충분" }
}
```
`said` = 사용자가 한 말 그대로(판단이 애매할 때 원문을 다시 읽는다). 키 값은 절대 여기 넣지 않는다 — 키는 `.env`.

## 수단(method)별 사용법

### `openai-api` (이미지)
- 키: `.env`의 `OPENAI_API_KEY`. 모델·퀄리티: 설정의 `model`/`quality` → `IMAGE_MODEL`/`IMAGE_QUALITY` 환경변수로 `tools/gen_image.py`에 전달.
- 레퍼런스 주입(앵커)으로 스타일 고정, 투명 스프라이트 정리 자동.

### `gemini-web` (영상·음악 — 로그인 세션, API 키 불필요)
- Playwright MCP 브라우저에서 gemini.google.com에 **사용자 본인 계정으로 로그인**. 로그인이 풀리면 사용자에게 다시 요청.
- 영상: `업로드 및 도구 → 동영상 만들기`, 첫 프레임 업로드 + `docs/MOTION_GUIDE.md` §3 프롬프트. 하루 생성 한도 있음.
- 음악: `업로드 및 도구 → 음악 만들기`. 결과는 `video` 요소로 렌더된다(약 3분) → `tools/make_loop.py`로 64초 루프.
- 결과 파일은 페이지 안 `fetch(currentSrc, {credentials:'include'})` → base64 → `browser_evaluate(filename=…)`로 받는다.
- 브라우저 세션은 하나 → 오케스트레이터가 직접 수행(서브에이전트 병렬 금지).

### `cc0-library` (효과음·음악)
- `tools/sound_lib/`(Kenney·OpenGameArt CC0, SFX 297 · BGM 20, `index.json` 태그 검색 `query.py`). 무료·상업 이용 가능.
- 게임 수가 늘면 BGM이 겹친다 → 시그니처 BGM은 다른 수단 권장.

### `elevenlabs-api` (효과음·음악) — 선택
- 키: `.env`의 `ELEVENLABS_API_KEY`. Sound Effects API(`/v1/sound-generation`), Music API. 무료 플랜 산출물은 상업 이용 불가.
- (어댑터 미구현: 처음 선택되면 sound 에이전트가 `tools/gen_sfx_elevenlabs.py`를 만들어 쓰고 이 문서에 추가한다.)

### `lyria-api` / `veo-api` (음악·영상, Gemini API 키) — 선택
- 키: `.env`의 `GEMINI_API_KEY`. 웹 세션 대신 API로 같은 모델 호출(유료). 어댑터는 처음 선택 시 작성.

### `manual` (어떤 능력이든)
- 사용자가 직접(웹 등) 만들어 `inbox/<game-id>/<key>.<ext>`에 넣는다. 파이프라인은 필요한 파일 목록(키·용도·프롬프트 제안)을 `inbox/<game-id>/WANTED.md`로 내보내고, 파일이 생기면 가져가 처리한다. 그 전엔 대체물(이미지: 생성 불가 → 빌드 보류 / 영상: 코드 모션 / 음악·효과음: CC0)로 진행.

### `skip`
- 그 능력을 쓰지 않는다. 영상 → 코드 모션만, 음악 → CC0 BGM, 효과음 → CC0. 이미지는 skip 불가(게임 아트 필수) → `manual` 또는 API 필요.
