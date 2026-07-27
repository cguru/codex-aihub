# Codex용 AI Hub 플러그인

`codex-aihub`는 Codex에서 자연어로 [AI Hub](https://aihub.or.kr/) 데이터셋을 찾고, 파일 목록과 용량을 확인하고, 승인된 파일을 선택해서 안전하게 다운로드할 수 있게 해 주는 비공식 오픈소스 플러그인입니다.

현재 `0.4.0` 버전은 데이터셋 검색·개수·상세 정보·가이드 조회, 정식 데이터 다운로드 승인 사전 확인, 정확한 파일 목록 확인, 선택한 파일 다운로드를 지원합니다. 일반적인 데이터 다운로드나 모델 구축 요청은 승인을 먼저 확인하며, **샘플(경량) 데이터는 사용자가 명시적으로 샘플을 요청했을 때만** 사용합니다.

## 가장 쉬운 설치 방법: Codex에게 맡기기

Codex에 아래 메시지를 그대로 보내세요.

```text
다음 GitHub 저장소의 Codex 플러그인을 설치해줘:
https://github.com/cguru/codex-aihub

이 저장소를 플러그인 마켓플레이스로 추가하고 codex-aihub를 설치해줘.
AIHUB_API_KEY가 없으면 키를 채팅으로 받지 말고 공식 발급 페이지를 안내해줘.
내가 로컬 키 파일의 경로를 알려주면 키 값을 화면에 출력하지 말고,
파일에서 실제 키만 읽어 Windows 사용자 환경변수 AIHUB_API_KEY에 등록해줘.
파일이 "AIHUB_KEY=키" 또는 "AIHUB_API_KEY=키" 형식이면 등호 뒤의 값만 등록해줘.
설치 후 새 Codex 작업에서 시험할 질문도 알려줘.
데이터셋 URL로 다운로드나 모델 제작을 요청하면 정식 다운로드 승인을 먼저 확인하고,
승인되지 않았으면 데이터 사용 신청을 안내한 뒤 작업을 중단해줘.
샘플 데이터는 내가 샘플 또는 경량 샘플이라고 명시했을 때만 사용하고,
정식 파일은 전체를 임의로 받지 말고 파일명과 용량을 먼저 보여준 뒤
내가 명시적으로 선택한 파일만 새 작업 폴더에 다운로드해줘.
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

## AI Hub API 키 등록하기

1. [AI Hub 공식 API 안내·키 발급 페이지](https://aihub.or.kr/devsport/apishell/list.do)에 로그인합니다.
2. **API key 발급**을 누르고 메일로 받은 개인 키를 확인합니다.
3. Windows 시작 메뉴에서 **환경 변수 편집**을 검색해 엽니다.
4. **사용자 변수**에 새 변수를 추가합니다.
   - 변수 이름: `AIHUB_API_KEY`
   - 변수 값: 메일의 `APIKEY` 오른쪽에 표시된 값만 입력
5. 실행 중인 Codex를 완전히 종료한 뒤 다시 시작합니다.

환경변수의 **이름**은 `AIHUB_API_KEY`이고, **값**에는 실제 키만 들어가야 합니다.

| 입력 위치 | 올바른 값 |
| --- | --- |
| 변수 이름 | `AIHUB_API_KEY` |
| 변수 값 | 메일에서 받은 APIKEY 값만 입력 |

변수 값에 `AIHUB_KEY=`나 `AIHUB_API_KEY=`를 붙이거나 따옴표로 감싸지 마세요. `AIHUB_API_KEY=발급받은-키` 전체를 변수 값에 넣는 것은 잘못된 등록입니다.

### 키 파일에서 안전하게 등록하기

키 파일은 저장소 밖의 개인 폴더에 두세요. 파일 내용은 다음 두 형식 중 하나만 사용합니다.
아래의 `발급받은-키`는 자리표시자입니다. 이 글자를 그대로 복사하지 말고 메일의 `APIKEY` 오른쪽 값을 넣으세요.

```text
발급받은-키
```

또는

```text
AIHUB_API_KEY=발급받은-키
```

아래 PowerShell 블록을 **그대로 실행**하면 키 파일 경로만 물어봅니다. 키 값은 화면이나 명령 기록에 출력하지 않으며, 두 파일 형식을 모두 처리해 실제 키만 Windows 사용자 환경변수에 저장합니다.

```powershell
& {
  param([Parameter(Mandatory)][string]$KeyPath)

  $KeyPath = $KeyPath.Trim().Trim('"').Trim("'")
  $key = (Get-Content -Raw -LiteralPath $KeyPath).Trim()
  if ($key -match '^(?:AIHUB_API_KEY|AIHUB_KEY)\s*=\s*(.+)$') {
    $key = $Matches[1].Trim()
  }
  if ($key -notmatch '^[0-9A-Fa-f]{8}-(?:[0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$') {
    throw '키 파일에서 올바른 AI Hub API 키를 찾지 못했습니다.'
  }

  [Environment]::SetEnvironmentVariable('AIHUB_API_KEY', $key, 'User')
} (Read-Host 'AI Hub API 키 파일의 전체 경로')

Write-Host '등록 완료: Codex를 완전히 종료한 뒤 다시 시작하세요.'
```

키 파일을 만드는 것만으로는 플러그인이 자동으로 읽지 않습니다. 위 절차로 `AIHUB_API_KEY` 사용자 환경변수에 등록해야 합니다.

등록 여부만 확인하려면 다음 명령을 사용하세요. 키 값은 출력하지 않습니다.

```powershell
if ([string]::IsNullOrWhiteSpace(
  [Environment]::GetEnvironmentVariable('AIHUB_API_KEY', 'User')
)) {
  '등록되지 않음'
} else {
  '등록됨'
}
```

일시적으로 현재 PowerShell 창에서만 시험하려면 아래처럼 설정할 수도 있습니다. 이 창에서 Codex를 실행해야 값이 전달됩니다.

```powershell
$env:AIHUB_API_KEY = "발급받은-개인-키"
```

위 명령의 따옴표는 PowerShell 문법이며 환경변수 값에 포함되지 않습니다.

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

```text
https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=71362
데이터를 다운받고 재활용품 객체 탐지 모델의 학습, 평가, 추론 프로그램을 만들어줘.
```

이 요청에서 Codex는 `dataSetSn=71362`를 읽고 정식 데이터 다운로드 승인을 먼저 확인합니다. 승인이 없으면 데이터나 샘플을 받지 않고 프로그램도 만들기 시작하지 않습니다.

샘플을 원하는 경우에만 다음처럼 `샘플`이라고 분명하게 적습니다.

```text
AI Hub에서 이미지 딥러닝 실습에 적당한 데이터셋을 찾아서
샘플(경량) 데이터만 내려받고 작은 모델을 만들 준비를 해줘.
```

```text
재활용품 분류 및 선별 데이터의 다운로드 파일을 용량이 작은 순서로 보여줘.
아직 다운로드하지는 마.
```

```text
방금 보여준 파일 중 내가 선택한 파일만
C:\work\aihub-recycling-data 라는 새 폴더에 다운로드해줘.
```

Codex가 다운로드 도구 사용 여부를 물으면 데이터셋, 파일명, 용량, 저장 경로를 확인한 뒤 승인하세요.

## 일반 데이터 요청은 승인을 먼저 확인합니다

데이터셋 URL이나 `dataSetSn`과 함께 다운로드, 학습, 평가, 추론 프로그램 제작을 요청하면 다음 순서로 처리합니다.

1. URL의 `dataSetSn`을 데이터셋 식별자로 사용합니다.
2. `check_dataset_download_access`로 정식 API 다운로드 승인을 확인합니다.
3. 승인되지 않았으면 아무 데이터도 저장하지 않고 다음 안내를 반환합니다.

```text
승인받지 않은 데이터는 다운로드할 수 없습니다.
AI Hub에서 데이터 사용 신청과 승인을 완료한 뒤 다시 요청해 주세요.
```

4. 승인이 확인된 경우에만 필요한 파일 목록과 용량을 확인하고 다운로드를 진행합니다.
5. 필요한 데이터가 성공적으로 내려받아진 뒤에만 학습·평가·추론 프로그램을 만듭니다.

승인 확인은 정식 파일 목록에서 가장 작은 파일의 응답을 열어 권한만 판별한 뒤 즉시 취소합니다. 확인 과정에서는 데이터셋 파일을 로컬에 저장하지 않습니다.

`작은 모델`, `빠른 실습`, `테스트`, `프로토타입` 같은 표현은 샘플 요청으로 간주하지 않습니다.

## 샘플과 정식 파일은 무엇이 다른가요?

AI Hub에는 서로 다른 두 다운로드 경로가 있습니다.

| 구분 | 인증 | 플러그인의 처리 |
| --- | --- | --- |
| 샘플(경량) 데이터 | AI Hub 웹 로그인 | 사용자가 샘플을 명시적으로 요청한 경우에만 웹페이지의 **샘플(경량) 데이터** 링크 사용 |
| 정식 API 파일 | `AIHUB_API_KEY` + 해당 데이터셋 다운로드 승인 | 승인을 먼저 확인하고 파일 키와 용량을 살핀 뒤 `download_dataset_files`로 선택 다운로드 |

샘플 링크는 API 키만으로 받을 수 있는 파일이 아닙니다. 사용자가 샘플을 명시적으로 요청했고 Codex가 브라우저를 사용할 수 없으면, 데이터셋 페이지를 열어 사용자가 샘플 버튼을 직접 누르도록 안내합니다. 브라우저 비밀번호나 쿠키를 Codex에 전달할 필요는 없습니다.

정식 데이터의 파일 목록이 보인다고 다운로드 승인이 완료된 것은 아닙니다. 승인되지 않은 데이터셋을 다운로드하려 하면 플러그인은 다음처럼 안내합니다.

```text
승인받지 않은 데이터는 다운로드할 수 없습니다.
AI Hub에서 데이터 사용 신청과 승인을 완료한 뒤 다시 요청해 주세요.
```

승인 절차를 우회하거나, 미승인 요청을 샘플로 바꾸거나, 전체 데이터셋을 자동 선택하지 않습니다.

## 제공 도구

| 도구 | 기능 | 권한 |
| --- | --- | --- |
| `search_datasets` | 키워드, 분야, 분류, 유형, 연도 등의 조건으로 검색 | 읽기 전용 |
| `count_datasets` | 같은 검색 조건에 맞는 데이터셋 개수 확인 | 읽기 전용 |
| `get_dataset` | 하나의 `dataSetSn`에 대한 전체 메타데이터 조회 | 읽기 전용 |
| `get_datasets_with_guide` | 구축·활용 가이드를 확인할 수 있는 데이터셋 검색 | 읽기 전용 |
| `check_dataset_download_access` | 정식 API 데이터 다운로드 승인 사전 확인, 파일 저장 없음 | 읽기 전용 |
| `list_dataset_files` | 정식 API 파일의 파일 키, 경로, 정확한 용량 조회 | 읽기 전용 |
| `download_dataset_files` | 명시적으로 선택한 승인 파일을 새 절대 경로에 다운로드 | 로컬 파일 생성 |

다운로드 도구는 다음 안전장치를 적용합니다.

- 실제 파일 저장 전 다운로드 승인 확인
- 미승인 시 샘플 대체와 후속 모델 작업 중단
- 기존 경로 덮어쓰기 거부
- 다운로드·압축 해제용 여유 공간 확인
- 임시 파일로 받은 뒤 완료 시 최종 경로 확정
- TAR 절대 경로, 상위 경로 이동, 심볼릭 링크 차단
- `.partN` 분할 파일의 숫자 순서 병합
- API 키와 원격 오류 본문의 안전한 비공개 처리

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
| `AIHUB_DOWNLOAD_BASE_URL` | `https://api.aihub.or.kr` | 개발용 다운로드 서비스 주소 재정의 |
| `AIHUB_DOWNLOAD_VERSION` | `0.6` | AI Hub 다운로드 API 버전 |
| `AIHUB_DOWNLOAD_TIMEOUT_MS` | `3600000` | 다운로드 제한 시간(기본 1시간) |

자동화 테스트에는 가짜 키와 합성 응답만 사용합니다. 기본 테스트를 실행하는 데 실제 API 키는 필요하지 않습니다.

## API 안정성

AI Hub는 현재 사용하는 엔드포인트를 안정적인 공개 API 계약으로 보장하지 않습니다. 따라서 예고 없이 응답 형식이 바뀌거나 사용할 수 없게 될 수 있습니다. 플러그인은 예상하지 못한 응답을 받으면 API 변경 가능성을 알리는 제한된 진단만 반환하며, 응답 본문이나 API 키를 오류 메시지에 복사하지 않습니다.

현재 사용하는 메타데이터 엔드포인트는 다음과 같습니다.

- `/mcp/dataSetList.do`
- `/mcp/dataSetCnt.do`
- `/mcp/dataSetDetail.do`
- `/mcp/getDataSetsWithGuide.do`
- `https://api.aihub.or.kr/down/{version}/{datasetKey}.do`

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
