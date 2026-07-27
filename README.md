# Codex용 AI Hub 플러그인

`codex-aihub`는 Codex에서 자연어로 [AI Hub](https://aihub.or.kr/) 데이터셋을 검색하고 메타데이터를 확인할 수 있게 해 주는 비공식 오픈소스 플러그인입니다.

현재 `0.1.1` 버전은 데이터셋 검색·개수 확인·상세 정보 조회만 지원합니다. 데이터 파일 목록 조회와 다운로드 기능은 아직 포함되어 있지 않습니다.

## 가장 쉬운 설치 방법: Codex에게 맡기기

Codex에 아래 메시지를 그대로 보내세요.

```text
다음 GitHub 저장소의 Codex 플러그인을 설치해줘:
https://github.com/cguru/codex-aihub

이 저장소를 플러그인 마켓플레이스로 추가하고 codex-aihub를 설치해줘.
AIHUB_API_KEY가 없으면 키를 채팅으로 받지 말고, 공식 발급 페이지와
내 운영체제에 맞는 안전한 로컬 환경변수 설정 방법을 안내해줘.
설치 후 새 Codex 작업에서 시험할 질문도 알려줘.
```

Codex는 다음 작업을 진행하거나 필요한 절차를 안내합니다.

1. 이 GitHub 저장소를 플러그인 마켓플레이스로 추가합니다.
2. `codex-aihub` 플러그인을 설치합니다.
3. AI Hub API 키가 없다면 공식 발급 페이지와 로컬 설정 방법을 안내합니다.
4. 설치와 키 설정이 끝나면 Codex를 다시 시작하거나 새 작업을 열도록 안내합니다.

API 키는 비밀번호와 같은 개인 인증 정보입니다. Codex 채팅, 프롬프트, 소스 코드, `.mcp.json`, 로그에 붙여넣지 마세요.

## 직접 설치하기

터미널에서 직접 설치하려면 다음 명령을 실행하세요.

```powershell
codex plugin marketplace add cguru/codex-aihub
codex plugin add codex-aihub@codex-aihub
```

설치 후 Codex를 다시 시작하거나 새 작업을 여세요.

## AI Hub API 키 준비하기

1. [AI Hub 공식 API 안내·키 발급 페이지](https://aihub.or.kr/devsport/apishell/list.do)에 로그인합니다.
2. 안내에 따라 개인 API 키를 발급받습니다.
3. Windows 시작 메뉴에서 **환경 변수 편집**을 검색해 엽니다.
4. **사용자 변수**에 새 변수를 추가합니다.
   - 변수 이름: `AIHUB_API_KEY`
   - 변수 값: 발급받은 개인 API 키
5. 실행 중인 Codex를 완전히 종료한 뒤 다시 시작합니다.

일시적으로 현재 PowerShell 창에서만 시험하려면 아래처럼 설정할 수도 있습니다. 이 창에서 Codex를 실행해야 값이 전달됩니다.

```powershell
$env:AIHUB_API_KEY = "발급받은-개인-키"
```

키 값을 채팅에 보내 설치를 맡기는 방식은 권장하지 않습니다. Codex에게는 발급 페이지를 열어 달라고 하거나, 운영체제에 맞는 환경변수 설정 절차만 안내해 달라고 하세요.

## Codex에서 사용하기

설치와 API 키 설정을 마친 뒤 새 Codex 작업에서 평소처럼 한국어로 질문하면 됩니다.

```text
AI Hub에서 한국어 음성 데이터셋을 찾아줘.
```

```text
AI Hub 의료 분야 데이터셋이 몇 개인지 세어줘.
```

```text
검색 결과 중 구축·활용 가이드가 있는 데이터셋만 보여줘.
```

```text
dataSetSn이 12345인 AI Hub 데이터셋의 상세 정보를 알려줘.
```

Codex가 도구 사용 여부를 물으면 내용을 확인한 뒤 승인하세요. 현재 제공되는 도구는 모두 읽기 전용입니다.

## 제공 도구

| 도구 | 기능 | 권한 |
| --- | --- | --- |
| `search_datasets` | 키워드, 분야, 분류, 유형, 연도 등의 조건으로 검색 | 읽기 전용 |
| `count_datasets` | 같은 검색 조건에 맞는 데이터셋 개수 확인 | 읽기 전용 |
| `get_dataset` | 하나의 `dataSetSn`에 대한 전체 메타데이터 조회 | 읽기 전용 |
| `get_datasets_with_guide` | 구축·활용 가이드를 확인할 수 있는 데이터셋 검색 | 읽기 전용 |

## 개발하기

개발 환경에는 Node.js 20 이상이 필요합니다.

```powershell
npm install
npm run check
```

`npm run build`는 배포용 단일 파일인 `dist/server.mjs`를 생성합니다. 설치된 플러그인은 이 파일을 Node.js로 실행하므로 별도의 `npm install`이 필요하지 않습니다.

- MCP 설정: `.mcp.json`
- 플러그인 정보: `.codex-plugin/plugin.json`
- 마켓플레이스 정보: `.agents/plugins/marketplace.json`

## 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `AIHUB_API_KEY` | 필수 | 개인 AI Hub API 키 |
| `AIHUB_METADATA_BASE_URL` | `https://aihub.or.kr` | 개발용 메타데이터 서비스 주소 재정의 |
| `AIHUB_REQUEST_TIMEOUT_MS` | `20000` | 요청 제한 시간(1,000~120,000ms) |

자동화 테스트에는 가짜 키와 합성 응답만 사용합니다. 기본 테스트를 실행하는 데 실제 API 키는 필요하지 않습니다.

## API 안정성

AI Hub는 현재 사용하는 엔드포인트를 안정적인 공개 API 계약으로 보장하지 않습니다. 따라서 예고 없이 응답 형식이 바뀌거나 사용할 수 없게 될 수 있습니다. 플러그인은 예상하지 못한 응답을 받으면 API 변경 가능성을 알리는 제한된 진단만 반환하며, 응답 본문이나 API 키를 오류 메시지에 복사하지 않습니다.

현재 사용하는 메타데이터 엔드포인트는 다음과 같습니다.

- `/mcp/dataSetList.do`
- `/mcp/dataSetCnt.do`
- `/mcp/dataSetDetail.do`
- `/mcp/getDataSetsWithGuide.do`

## 중요 안내

> 이 프로젝트는 AI Hub 또는 NIA가 제작·승인한 공식 프로젝트가 아닌 커뮤니티 오픈소스 프로젝트입니다. 데이터셋 접근과 이용에는 AI Hub의 승인 절차 및 관련 이용 정책이 적용됩니다. AI Hub 엔드포인트는 보장된 공개 API가 아니며 예고 없이 변경되거나 중단될 수 있습니다.

이 플러그인은 데이터 접근 승인 절차를 우회하지 않습니다. 다운로드한 데이터셋을 이 저장소, 릴리스, 테스트 파일에 추가하지 마세요. 데이터를 이용하거나 이전하기 전에 [AI Hub 데이터 이용정책](https://aihub.or.kr/intrcn/guid/usagepolicy.do)을 확인하세요.

## 문서

- [구조 설명](docs/architecture.md)
- [AI Hub 권한·정책 기록](docs/aihub-permission.md)
- [개발 로드맵](docs/roadmap.md)
- [보안 정책](SECURITY.md)

Codex 플러그인 패키징은 [OpenAI 플러그인 공식 문서](https://developers.openai.com/plugins/build/plugins)를, MCP 도구 구성은 [OpenAI MCP 서버 공식 문서](https://developers.openai.com/plugins/build/mcp-server)를 따릅니다.

## 라이선스

플러그인 소스 코드는 [MIT License](LICENSE)로 제공됩니다. AI Hub 데이터셋 콘텐츠에는 이 라이선스가 적용되지 않습니다.
