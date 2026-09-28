# STARSHIP — Flight Experience

실시간 WebGL로 **Starship V3 / Super Heavy V3의 발사 준비 → 추진제 적재 → 엔진 베이 → 카운트다운 → 점화 → 이륙 → Max Q → 고고도 → hot-staging → 분리**까지 따라가는 장편 시네마틱 3D 웹 경험입니다.

> 목표는 단순한 Three.js 데모가 아니라, 브라우저에서 실행되고 있다는 사실이 놀라울 정도의 몰입감 있는 실시간 발사 경험입니다.

## 현재 상태

**v0.9 High-detail Candidate**

현재 16개 시퀀스를 구현했으며 AUTO MODE 기준 전체 재생 시간은 약 **7분 31초**입니다.

- Starbase / Pad 2 원경
- 124 m급 발사체 접근
- 발사탑·catch arm·탱크팜·배관
- 추진제 적재와 venting
- 교육용 탱크 cutaway
- Super Heavy 33개 Raptor 엔진 베이
- Final Countdown
- Engine ignition
- Liftoff
- Tower clear
- 대기권 상승 / 구름 통과
- Max Q
- 고고도 / 지구 곡률
- Super Heavy MECO
- 6개 Ship 엔진 hot-staging
- Starship / Super Heavy separation

## 렌더링 구성

### High-detail mode

- Three.js / WebGL
- PBR 기반 금속·콘크리트·배관 재질
- ACES Filmic Tone Mapping
- Bloom
- 고해상도 Block 3 GLB
- procedural atmosphere / clouds / Earth
- 33개 Super Heavy plume
- 6개 Starship plume
- venting / smoke / launch illumination
- cinematic camera rail
- AUTO / EXPLORE / Timeline
- adaptive quality
- procedural audio

### Fallback mode

`fallback.html`은 외부 3D 모델이나 CDN을 불러올 수 없는 환경에서도 실행할 수 있도록 만든 자체 WebGL2 버전입니다.

## 정확성 원칙

실제 차량 구조·수치·비행 시퀀스는 제작 시점의 SpaceX 공식 Starship 자료와 Flight 12/13 공개 자료를 우선합니다.

현재 시각화 기준에는 다음이 포함됩니다.

- Starship/Super Heavy V3
- 전체 높이 약 124 m
- 직경 9 m
- Super Heavy: 33 × Raptor 3
- Starship: 6 × Raptor
- V3 3-grid-fin 구성
- integrated hot-stage 구조
- Flight 13 기준 Max Q / MECO / hot-staging 시점 참고

카메라 이동, 압축된 공간 스케일, 내부 탱크 색상, 입자·화염·구름 및 일부 가속도/속도 보간은 **cinematic / educational approximation**입니다. 실제 텔레메트리 재생으로 표현하지 않습니다.

자세한 사실/연출 구분은 `docs/RESEARCH.md`, `docs/DECISIONS.md`를 확인하세요.

## 로컬 실행

별도 빌드 없이 정적 서버에서 실행할 수 있습니다.

```bash
python -m http.server 8080
```

그 뒤:

```text
http://localhost:8080
```

High-detail mode는 Three.js와 GLB 모델을 외부 CDN에서 불러오므로 인터넷 연결이 필요합니다.

인터넷 없이 실행하려면:

```text
http://localhost:8080/fallback.html
```

## GitHub Pages

`.github/workflows/pages.yml`이 `main` 브랜치 push마다 정적 프로젝트를 GitHub Pages에 배포하도록 구성됩니다.

저장소에서:

**Settings → Pages → Source → GitHub Actions**

를 선택하면 됩니다.

배포 후 주소:

```text
https://juhwan7.github.io/starship-launch-experience/
```

## 프로젝트 문서

| 문서 | 역할 |
| --- | --- |
| `PROJECT_STATUS.md` | 현재 구현 상태와 다음 우선순위 |
| `AGENTS.md` | 이후 AI/개발자가 따라야 할 작업 원칙 |
| `docs/RESEARCH.md` | Starship 조사 및 사실/근사 구분 |
| `docs/STORYBOARD.md` | 전체 시네마틱 흐름 |
| `docs/SHOTLIST.md` | 주요 카메라 샷 |
| `docs/CAMERA.md` | 카메라 연출 기준 |
| `docs/SCENES.md` | 장면 구조 |
| `docs/VFX.md` | 화염·연기·venting 등 VFX |
| `docs/MATERIALS.md` | PBR/재질 기준 |
| `docs/PERFORMANCE.md` | 성능/품질 정책 |
| `docs/QA.md` | 브라우저 QA 상태 |
| `docs/ASSETS.md` | 외부 자산과 라이선스 |
| `docs/SOURCES.md` | 조사 출처 |
| `docs/FAILED_EXPERIMENTS.md` | 실패한 접근과 재발 방지 기록 |

## 외부 3D 모델 / Attribution

High-detail 차량 모델은 runtime에서 `haskaomni/blueprint` 프로젝트의 `starship-block3.glb`를 사용합니다.

원작:

**SpaceX Starship Block 3 — Clarence365**

License:

**CC BY 4.0**

모델 파일은 이 저장소에 무단 재배포하지 않고 runtime CDN 방식으로 불러오며, 세부 attribution은 `docs/ASSETS.md`에 기록합니다.

## 목표 품질

v1.0은 다음 조건을 모두 만족해야 완료로 간주합니다.

- 발사 준비부터 분리까지 전체 AUTO 시퀀스 완주
- 핵심 모델 PBR 재질 완성
- 점화/화염/연기/대기/구름 개선
- hot-staging 근접 장면 완성
- Desktop / Android / iOS Safari 검증
- asset 404 / console error 없음
- GitHub Pages 실배포 검증
- 주요 장면 실제 브라우저 스크린샷 QA
- FPS / 메모리 / adaptive quality 검증
- 외부 자산 출처 및 라이선스 문서화

## License

프로젝트 코드: **MIT**

외부 모델과 기타 자산은 각각의 원 라이선스를 따릅니다.
