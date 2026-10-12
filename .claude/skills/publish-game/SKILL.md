---
name: publish-game
description: 완성된 게임(games/<id>/dist/index.html)을 공유 가능한 곳에 올린다. 사용 가능한 호스팅/아티팩트 MCP가 있으면 업로드·링크 공유, 없으면 로컬 파일 경로를 안내. 선택적으로 메신저 알림. "/publish-game <id>", "배포해줘", "링크 줘"에 사용.
argument-hint: <id> [--draft] [--share] [--notify]
---

# /publish-game

**게이트**: `--draft`면 QA L1 통과만으로 올리고 제목·설명에 '초안'을 붙인다. 정식(초안 표기 없음)은 L1·L2 통과 + 블라인드 3초 테스트 통과가 필요하다(make-game 10단계). 같은 게임이 이미 올라가 있으면 새로 만들지 말고 같은 링크를 갱신한다(`games/<id>/ARTIFACT`).

1. `node tools/bundle.mjs <id>` 최신 번들 확인, 크기 ≤ 10MB(대부분의 업로드 한도 안).
2. **업로드 대상 선택** — 세션에 있는 도구를 확인해 고른다:
   - 아티팩트/정적 호스팅 MCP(예: artifact 서버의 `deploy`→presigned 업로드→`complete`, 재배포는 `update`로 링크 유지): 업로드에 `python3 tools/upload_presigned.py <fields.json> <file> <upload_url>`를 쓸 수 있다(응답의 upload.url·fields 그대로).
   - 없으면: 로컬 경로 `games/<id>/dist/index.html`을 안내(더블클릭으로 실행되는 단일 파일). 사용자가 원하면 다른 방법(예: GitHub Pages)을 제안하되 **사용자 확인 없이 외부에 올리지 마라**.
3. 공개 범위: `.pipeline/providers.json`의 `publish.visibility`가 있으면 그 값(예: 조직 전체 공개), 없으면 비공개. `--share` 또는 사용자 요청 시 공개로 연다.
4. 링크를 `games/<id>/ARTIFACT`와 `games/REGISTRY.md`에 기록(둘 다 로컬, git 미추적).
5. `--notify` 또는 사용자 요청 시에만 메신저(예: Slack MCP)로 본인에게 알림.
