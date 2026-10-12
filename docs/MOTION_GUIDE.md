# MOTION GUIDE — 영상 생성으로 게임 오브젝트를 움직이기

> 정지 스프라이트 + 코드 모션(kit juice)이 기본이다. 그 위에 **게임플레이에 직접 관여하는 오브젝트**의 모션을 영상 생성(Gemini 웹 `동영상 만들기`)으로 만든다.
> 장식(배경·로고)보다 **플레이어가 반응해야 하는 것**이 우선이다: 몬스터 공격 예고, 피격, 사망, 캐릭터 액션, 보상 공개.

## 0. '부드럽다·에셋 같다'의 원천 (운영자 레퍼런스: Kingshot 광고, 2026-10-09)
> "되게 부드럽게 움직이고 그림이 아니라 에셋 같잖아. 이런 느낌을 원했어."
1. **연속 이동이 1순위** — 부드러움의 대부분은 클립이 아니라 매 프레임 위치가 연속으로 바뀌는 데서 나온다(60fps 실시간, 칸/턴 점프 없음). 작은 유닛은 이동 중 통통 튀기(bob 2–4px)·진행 방향 기울기만으로 걷는 것처럼 보인다.
2. **무리(crowd)** — 적 1마리보다 작은 유닛 10–30마리 덩어리가 밀려오는 장면이 '살아 있다'로 읽힌다.
3. **바닥에 붙은 세계** — 3/4 탑다운의 연속된 땅, 오브젝트마다 방향성 있는 부드러운 그림자. 격자·레일이 보이면 보드게임처럼 읽힌다.
4. **물리적 보상** — 처치 시 금화가 바닥에 튀어 떨어지고 주인공에게 빨려 온다. 건설은 바닥 패드에 금이 빨려 들어가며 건물이 솟는다.
5. **에셋 그림체** — 두꺼운 외곽선 2D 일러스트 대신 '3D 렌더 스타일라이즈드 게임 에셋'(로우폴리·소프트 조명·재질감·3/4 시점)을 고를 수 있다. 장르가 디펜스·RTS·액션이면 이 스타일을 우선 검토.
6. 그 위에 영상 클립(주인공 달리기·공격, 적 공격 예고, 건물 완성)을 얹는다.

## 1. 무엇을 움직이나 (우선순위)
1. **판단에 쓰이는 모션** — 적의 공격 준비(텔레그래프), 보스 패턴 전환, 함정 작동. 플레이어가 보고 판단한다 → 가장 먼저.
2. **피드백 모션** — 피격·사망·레벨업·진화. 성공/실패의 인과를 보여준다.
3. **피크 모션** — 럭키박스·보물상자 오픈·대폭발. 1회성, 광고 한 장면.
4. **분위기 모션** — 대표 캐릭터 idle 루프. 화면을 살아 있게.

캐릭터/몬스터당 클립 세트: `idle`(루프) · `attack`(1회) · `hit`(1회) · `death`(1회) · 필요 시 `special`. GDD `## 모션` 표에 키·원본 스프라이트·동작 묘사·루프 여부·길이·우선순위를 적는다.

## 2. 하루 한도
Gemini 웹 영상 생성은 계정당 하루 개수 한도가 있다(2026-10 기준 수 개). 오케스트레이터는 GDD 우선순위대로 쓰고, 남은 클립은 **대체 코드 모션**(squash·wobble·flash·shake·tint 조합)으로 출시한다. 다음 날 같은 스킬(`/game-motion`)로 이어 만든다.

## 3. 프롬프트 템플릿 (필수 문구 — 없으면 3D 피규어로 바뀐다)
```
Use MY uploaded image as the exact first frame, pixel for pixel. Keep it a flat 2D cartoon
mobile-game illustration exactly like the image: same thick dark outlines, same cel shading,
same colors and proportions. Do NOT turn it into 3D or realistic.
Animation (<루프|one-shot>, about <N> seconds): <동작 묘사 — 예비 동작 → 핵심 동작 → 복귀>.
Background stays pure flat white (#FFFFFF) the entire time: no floor, no ground shadow,
no texture, no vignette. Locked static camera, no zoom, no pan. No text. No sound.
<루프면> Seamless loop: the last frame matches the first frame.
```
- **3D 렌더 에셋이면** 2~3행을 "Keep the exact same stylized 3D-rendered mobile-game asset look as the image: same soft 3D render texture, same character, same face… Do not change the art style, do not make it realistic."로 바꾼다.
- 첫 프레임 PNG는 `~/mini-game/.playwright-mcp/veo/`에 둔다(Playwright MCP 업로드 허용 경로).
- **방향 고정 문구 필수**(측면·뒷-3/4 캐릭터): "IMPORTANT ORIENTATION LOCK: he keeps facing to the <right>, seen from <behind at a three-quarter side angle> exactly like the first frame, for the whole video. He never turns his body or face toward the camera." — 없으면 Veo가 중간에 몸을 카메라 쪽으로 돌린다(epoch 투석병 1차 실패, 넣은 투창병은 성공).
- 클립은 10초로 나온다: "one-shot, about 2 seconds, then hold still" + "recovers to the starting ready pose"로 쓰고 `--end 2.0`으로 자른다 → 첫·끝 프레임이 같아 연속 재생 가능. 발사 프레임은 meta `releaseFrame`에 기록.
- 공격 모션은 **예비 동작(anticipation)을 길게**: 플레이어가 보고 반응할 시간(≥ 0.4초).
- 첫 프레임 캔버스: 1280×720 흰 배경, 스프라이트 중앙. 튀어나가는 동작이면 그 방향으로 여백.

## 4. 처리
`python tools/video_to_sprites.py <mp4> games/<id>/assets/anim/<key> --fps 12 --max 300 [--loop auto|none|pingpong] [--start s --end s]`
→ manifest `sheets`에 `{ key, file, meta }` 등록 → 게임에서 `Kit.anim(...)` 또는 `Kit.animSet(...)`.
- 1회성 클립은 `--loop none`, 끝난 뒤 idle로 복귀는 `Kit.animSet`이 처리. 예고처럼 마지막 자세를 유지해야 하면 meta에 `"hold": "last"`.
- 용량: 시트 1개 0.7–1.6MB. 게임당 10MB 예산 안에서 클립 수를 정한다(fps 10, max 240으로 낮추면 절반).

## 5. kit API
- `Kit.anim(scene, key, x, y, { height, onComplete })` — 단일 클립.
- `Kit.animSet(scene, x, y, { idle, attack, hit, death }, { height })` → 스프라이트. `.playClip('attack', onDone)` 후 자동으로 idle 복귀, `death`는 마지막 프레임 유지.
