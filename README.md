# GARO XII — e牙狼12黄金騎士極限 시뮬레이터 v1.1

비공식 팬 제작 **모의 파칭코 시뮬레이터**. 산세이 R&D 및 작품 저작권자와 무관합니다. 금전 거래·현금 지급 없음.

## v1.1 새 기능

- 효과음 관리 창과 음량 슬라이더
- 4종 실기 효과음 슬롯: 선축하음(금), C.F.O.G. 재점등음(빨강), 극한 7500 배틀 승리음, GOD OF GARO 7500 획득음
- 슬롯마다 MP3 등의 음원 파일 선택 / 미리듣기 / 기본으로 되돌리기
- 웹 브라우저에서 선택한 파일은 저장 가능한 환경에서는 IndexedDB에 보존. 브라우저 보안 설정·시크릿 모드에 따라 저장되지 않을 수 있습니다.
- 소스 폴더에 공식 MP3 파일을 배치하면 사이트가 자동으로 해당 파일을 우선 재생
- 별도 음원이 없어도 **자체 제작 임시 효과음 4종**이 재생되도록 구성 (실제 기기 음원 아님)
- 기존 v1.0과 동일한 로컬 기록 키(`garo12-simulator-v1`)를 유지하여 같은 사이트 주소에서 업데이트하면 통계 유지

## 빠르게 실행하기

1. ZIP 압축을 풀고 `index.html`을 엽니다. (Chrome / Edge 권장)
2. 오른쪽 위의 **♪ OFF** 버튼으로 소리를 켭니다.
3. **⚙ 음향**을 눌러 4개 소리를 직접 들어보고 음량을 변경합니다.
4. 실제 원음 파일이 있으면 음향 창에서 각각 **파일 선택**을 사용하세요.
5. 이후 **회전 시작** / **강제 당첨** / **LT 직행**으로 효과음 재생을 확인하세요.

## 공식 소리 확보 경로

산세이 R&D의 공식 GARO 다운로드 페이지: 
https://www.sansei-rd.co.jp/p_garo_archive/download/sound.html

위 페이지는 해당 소리의 상업/비상업적 이용을 자유롭게 허용한다고 안내합니다. 다만 **이 ZIP 파일에는 공식 음원이 들어 있지 않습니다.** 공개 GitHub에 원본 파일을 재배포할 계획이라면 재배포 허용 범위도 확인하세요.

## 각 효과음 파일 이름 (GitHub에 영구 적용)

**직접 다운로드한 음원 파일을 다음 경로에 넣습니다.** 기존 파일이 없으면 `demo_*.mp3` 효과음이 자동으로 선택됩니다.

| 상황 | 배치할 공식 파일명 |
| --- | --- |
| 선축하음(금) | `assets/sfx/prewin_gold.mp3` |
| C.F.O.G. 재점등음(빨강) | `assets/sfx/cfog_red.mp3` |
| 극한 7500 배틀 승리 | `assets/sfx/battle_victory.mp3` |
| GOD OF GARO 7500 획득 | `assets/sfx/god7500.mp3` |

**중요:** 폴더에 파일을 넣을 때는 mp3 확장자가 실제 파일 형식과 일치해야 합니다. WAV, OGG 파일은 음향창의 '파일 선택'으로 테스트할 수 있지만 GitHub 자동 연결에는 MP3를 권장합니다.

## GitHub Pages 무료 배포

1. github.com에서 신규 공개(Public) 저장소 `garo12-simulator`를 만듭니다.
2. 이 ZIP 내부 내용 전체(`index.html`, `app.js`, `styles.css`, `assets/sfx/` 등)를 저장소의 **루트**에 올립니다. **ZIP 파일 그대로 업로드하는 것이 아닙니다.**
3. 저장소의 **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**를 선택합니다.
4. `https://아이디.github.io/garo12-simulator/` 형태의 주소에서 접속합니다.
5. 수정 시 기존 프로젝트의 특정 파일만 갱신하면 됩니다. 플레이 기록은 **같은 브라우저·같은 주소**에서 유지됩니다. GitHub 저장소 이름이나 페이지 주소를 바꾸면 저장 데이터가 자동 이전되지는 않습니다.

GitHub Pages는 정적 사이트 호스팅이므로 서버 비용 없이 HTML, JavaScript, CSS, MP3를 배포할 수 있습니다. 공개 저장소에 올린 파일은 다른 사람도 읽고 저장할 수 있으므로 저작권이 불분명한 음원·영상은 등록하지 마세요.

## 구조

```
index.html
styles.css
app.js
assets/
  sfx/
    demo_prewin_gold.mp3       # 자체 제작 임시 음향
    demo_cfog_red.mp3          # 자체 제작 임시 음향
    demo_battle_victory.mp3    # 자체 제작 임시 음향
    demo_god7500.mp3           # 자체 제작 임시 음향
    prewin_gold.mp3            # 사용자가 직접 넣을 공식 음원 (현재 없음)
    cfog_red.mp3               # 현재 없음
    battle_victory.mp3         # 현재 없음
    god7500.mp3                # 현재 없음
```

## 기존 게임 스펙

통상 도안 당첨 1/437.49, GARO CHARGE 1/1749.97. 도안 1,500발 + 1차 배틀 50% 극한 7500 진입, 극한 7500 배틀 50% 성공 → 7,500발 및 LT, LT 지속 약 76% (25% 7,500, 51% 1,500 지속, 24% 1,500 종료). 실제 영상이나 장치 연출의 정밀 재현은 후속 단계입니다.

확률/기기 정보 참고: https://www.sansei-rd.co.jp/p_garo_archive/archive/p_garo12_ok.html
