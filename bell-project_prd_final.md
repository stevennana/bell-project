# QR 기반 음식점 주문/결제 시스템 - 완성형 PRD

---

## 1. 문제 정의
- 기존 음식점은 메뉴판, 주문, 결제, 주문 상태 확인이 분리되어 있으며, 메뉴 변경 시 과거 주문 이력과 가격을 정확히 추적하기 어려움.
- 고객이 주문을 위해 줄을 서야 하며, 진행 상태 확인이 불가.
- 이를 해결하기 위해 고객이 자신의 휴대폰으로 메뉴 확인, 주문, 결제, 주문 상태 확인이 가능하도록 한다.

---

## 2. 비즈니스 목표
- 고객이 줄을 서지 않고 주문/결제/상태확인을 휴대폰에서 처리
- 사장은 메뉴 버전 관리, 주문 관리, 결제 연동, POS 프린터 출력 가능
- 과거 메뉴와 가격 이력 보존
- 운영자 개입 최소화 및 클라우드 네이티브 아키텍처로 운영비 절감

---

## 3. 페르소나별 기능 요구사항

### 3.1 일반 고객
- QR 코드로 메뉴 페이지 접근
- 최신 메뉴 버전 조회
- 메뉴/옵션 선택 및 수정 가능 (주문 확정 전까지)
- 주문 확정 시 서버 검증 후 결제 화면으로 이동
- 네이버페이/카카오페이 결제 (확장 가능)
- 결제 완료 시 주문 번호와 상태 조회 가능
- 조리 시작 전까지 취소 가능
- 조리 완료 시 픽업 안내 (웹 푸시/SMS/이메일/앱 푸시)
- 30분 동안 픽업 미확정 시 자동 완료

### 3.2 음식점 사장
- 레스토랑 ID 기반 로그인
- **카테고리 관리**: 카테고리 생성, 편집, 활성화/비활성화
- 메뉴 등록(이미지, 이름, 가격, 옵션, 설명)
- 메뉴 버전 확정 시 과거 버전 비활성화
- **카테고리 비활성화 시 관련 메뉴 초안 상태로 전환**
- **활성화된 카테고리로 메뉴 이동 후 게시 확인 기능**
- 주문 리스트/상태 조회
- 주문 확인/조리 시작 (POS 프린터 ESC/POS 출력)
- 주문 취소 (조리 전/후 5% 환불 상한)
- 조리 완료 → 고객 픽업 안내
- 픽업 완료 처리 (수동/자동 30분)
- 일자별 판매 내역, 결제 연동 내역 조회

### 3.3 시스템 관리자
- 관리자 계정으로 로그인 (admin@bell.com / admin123)
- 레스토랑 계정 생성 및 관리
- 레스토랑 ID (예: rest_001) 할당 및 이름 설정
- 레스토랑별 소유자 로그인 정보 관리
- 레스토랑 활성화 코드 생성 및 관리
- 레스토랑 상태 관리 (활성/비활성)

---

## 4. 비기능 요구사항
- 서버리스 아키텍처 (AWS Lambda + API Gateway)
- 프런트엔드 정적 배포(S3 + CloudFront)
- 데이터 저장은 DynamoDB + S3
- 인증은 Cognito 사용
- POS 프린터 ESC/POS 지원
- 자동화된 상태 전이 및 알림
- 운영비 최소화

---

## 5. 환경 변수 및 비즈니스 규칙 파라미터

| 파라미터명              | 기본값  | 설명 |
|------------------------|--------|------|
| AUTO_COMPLETE_MINUTES  | 30     | READY 상태 이후 자동 완료까지 시간(분) |
| CART_TTL_MINUTES       | 10     | 미확정 장바구니 TTL(분) |
| REFUND_CAP_PERCENT     | 5      | 조리 후 취소 시 최대 환불 비율 |
| ALLOWED_PAYMENT_METHODS| naverpay,kakaopay | 지원 결제 수단 |
| POS_PRINTER_COUNT      | 1      | POS 프린터 수(확장 가능) |

---

## 6. 기능별 Acceptance Criteria (AC)

### 예시 - 주문 생성 API
- **성공 기준**
  - 유효한 메뉴 버전과 옵션 선택
  - 가격 검증 성공
  - 주문 상태 CREATED로 생성
- **실패 기준**
  - 메뉴 버전 불일치 → 409 Conflict
  - 가격 불일치 → 422 Unprocessable Entity
  - 재고 없음 → 410 Gone

모든 API별 AC는 부록 A에 상세화.

---

## 7. 이벤트/비동기 처리 설계
- **주문 자동 완료**: EventBridge Scheduler → Lambda 호출
- **결제 상태 재조회**: SQS 딜레이 큐 기반 백오프 (3회, 30s→2m→5m)
- **POS 출력 재시도**: 최대 2회, 15초 간격
- **알림 우선순위**: 웹 푸시 → 앱 푸시 → SMS → 이메일

---

## 8. POS 출력 API 설계
- **POST /pos/print**: 주문 ID 기반 출력 요청
- **GET /pos/print/{jobId}**: 출력 상태 조회
- **POST /pos/reprint**: 재출력 요청

---

## 9. 완성형 OpenAPI 3.1 스키마 (요약)
```yaml
openapi: 3.1.0
info:
  title: Restaurant Ordering API
  version: 1.0.0
components:
  schemas:
    ErrorResponse:
      type: object
      properties:
        type: { type: string }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
paths:
  /menu:
    get:
      summary: Get latest menu version
      responses:
        "200":
          description: OK
    post:
      summary: Create new menu version (Owner only)
      responses:
        "201":
          description: Created
  /order:
    post:
      summary: Create new order
      responses:
        "201":
          description: Created
  /order/{orderId}:
    get:
      summary: Get order status
    delete:
      summary: Cancel order
  /pos/print:
    post:
      summary: Print order to POS
  /pos/print/{jobId}:
    get:
      summary: Get POS print status
  /restaurants:
    get:
      summary: Get all restaurants (Admin only)
    post:
      summary: Create new restaurant (Admin only)
  /restaurants/{restaurantId}:
    get:
      summary: Get restaurant details
    put:
      summary: Update restaurant (Admin only)
    delete:
      summary: Delete restaurant (Admin only)
  /restaurants/verify:
    post:
      summary: Verify owner credentials
  /restaurants/{restaurantId}/categories:
    get:
      summary: Get restaurant categories
    post:
      summary: Create new category
  /restaurants/{restaurantId}/categories/{categoryId}:
    put:
      summary: Update category (activate/deactivate)
```

---

## 10. DynamoDB 테이블 정의서

**1. bell-restaurants-{env}**: 레스토랑 계정 관리
| PK (restaurantId) | - | restaurantName, ownerEmail, ownerPassword, activationCode, status, createdAt, updatedAt |

**2. bell-menus-{env}**: 메뉴 버전 관리
| PK (restaurantId) | SK (version) | items, createdAt, status |

**카테고리 관리**: 레스토랑 레코드 내 categories 배열로 관리
| Restaurant Record | categories: [{id, name, displayName, active, order, createdAt, updatedAt}] |

**3. bell-orders-{env}**: 주문 생명주기
| PK (orderId) | SK (restaurantId) | menuSnapshot, status, timestamps, paymentInfo |

**4. bell-users-{env}**: 사장 인증
| PK (userId) | SK (type=OWNER) | email, passwordHash, createdAt |

**5. bell-pos-jobs-{env}**: POS 출력 작업
| PK (jobId) | - | orderId, status, createdAt, completedAt |

---

## 10. 카테고리 관리 비즈니스 규칙

### 10.1 카테고리 생성/편집
- 카테고리는 레스토랑별로 독립적으로 관리됨
- 카테고리 삭제 기능 없음 (비활성화만 가능)
- 카테고리 순서(order) 자동 할당 및 수동 변경 가능
- 기본 카테고리: Burgers, Sides, Drinks, Desserts

### 10.2 카테고리 비활성화 규칙
- 카테고리 비활성화 시 해당 카테고리의 모든 메뉴 아이템이 초안(draft) 상태로 전환
- 메뉴를 다시 게시하려면 활성화된 카테고리로 이동 후 게시 확인 필요
- 카테고리 재활성화 시 이전 메뉴 상태는 복원되지 않음 (수동 재게시 필요)

### 10.3 데이터 저장 방식
- 카테고리는 레스토랑 레코드 내 `categories` 배열로 저장
- 별도 테이블이 아닌 임베디드 문서 형태로 관리
- 레스토랑 관리 기능과의 충돌 방지

---

## 11. 아키텍처
### 11.1 최종 목표: AWS 아키텍처
- Frontend: S3 + CloudFront
- Backend: API Gateway + Lambda (TypeScript)
- DB: DynamoDB + S3
- Auth: Cognito
- Async: EventBridge + SQS
- Monitoring: CloudWatch + X-Ray

### 11.2 개발 아키텍처
11.1의 AWS아키텍처와 호환되는 로컬 프로젝트 셋업 필수
- 프로젝트 모듈
- 디렉토리 구조
- 기타

---

## 12. 개발 완료 상태

### 12.1 백엔드 구현 상태 (100% 완료)
- ✅ 모든 API 엔드포인트 구현 및 테스트 완료
- ✅ DynamoDB 테이블 및 연산 구성 완료
- ✅ 결제 연동 (NaverPay/KakaoPay) 준비 완료
- ✅ POS 프린터 연동 구현 완료
- ✅ **카테고리 관리 API 구현 완료**
- ✅ 레스토랑 관리 API 구현 완료
- ✅ 로컬 개발 환경 구성 완료
- ✅ 프로덕션 배포 스크립트 준비 완료

### 12.2 프론트엔드 구현 상태 (100% 완료)
- ✅ **고객 프론트엔드**: 모바일 우선 QR 주문 경험 (포트 3002)
- ✅ **사장 대시보드**: 데스크톱/모바일 레스토랑 관리 시스템 (포트 3001)
  - ✅ **카테고리 관리 기능 구현**: 생성, 편집, 활성화/비활성화
  - ✅ 메뉴 관리 및 버전 관리
  - ✅ 주문 관리 및 POS 연동
- ✅ **관리자 대시보드**: 레스토랑 관리 인터페이스 (포트 8080)
- ✅ Tailwind CSS 스타일링 및 반응형 디자인
- ✅ TypeScript 및 공유 API 타입
- ✅ React Router 네비게이션
- ✅ TanStack Query API 상태 관리

### 12.3 주요 구현 완료 기능
- ✅ **카테고리 관리 시스템**: 완전한 CRUD 작업 지원
- ✅ **메뉴 버전 관리**: 초안/게시 상태 관리
- ✅ **주문 생명주기**: 생성부터 완료까지 전체 플로우
- ✅ **결제 연동**: NaverPay/KakaoPay 웹훅 처리
- ✅ **POS 프린터 연동**: ESC/POS 명령 지원
- ✅ **자동화**: EventBridge 기반 주문 자동 완료
- ✅ **인증 시스템**: 관리자 및 사장 인증
- ✅ **다중 레스토랑 시스템**: 레스토랑별 독립적 관리

## 13. 비용 추정
- 평균 트래픽 10 rps: $100~$340/월
- Idle 상태: $5~$15/월

---

## 14. 로컬 개발 가이드

### 14.1 개발 환경 구성
- **백엔드**: AWS SAM CLI + DynamoDB Local (Docker)
- **프론트엔드**: Vite/React (포트 분리)
  - 고객 UI: http://localhost:3002 (모바일 우선)
  - 사장 UI: http://localhost:3001 (데스크톱/모바일)
  - 관리자 UI: http://localhost:8080 (데스크톱)
- **DB**: DynamoDB Local (port 8000) + Admin UI (port 8001)
- **API**: AWS Lambda Local (port 3000)
- **POS 출력**: ESC/POS 시뮬레이터
- **결제 모듈**: 네이버페이/카카오페이 Sandbox API

### 14.2 개발 스크립트
- `./dev-local.sh`: 백엔드 환경 시작 (DynamoDB + API)
- `./dev-frontend.sh`: 프론트엔드 환경 시작 (3개 UI 앱)
- `./dev-stop.sh`: 백엔드 환경 종료
- `./dev-frontend-stop.sh`: 프론트엔드 환경 종료

### 14.3 관리자 인증 정보
- **관리자 로그인**: admin@bell.com / admin123
- **관리자 대시보드**: http://localhost:8080

### 14.4 카테고리 관리 테스트
- **기본 카테고리 시드**: `scripts/seed-categories.sh`
- **카테고리 API 테스트**: Swagger UI (http://localhost:8082)
- **사장 대시보드**: 메뉴 관리 → 카테고리 관리

---
# 부록 A: 기능별 Acceptance Criteria (AC) 상세

## 1. 메뉴 조회 API (`GET /menu`)
- **성공 기준**
  - 요청 시점의 최신 메뉴 버전 반환
  - 응답에 메뉴 항목, 가격, 옵션, 설명, 이미지 포함
- **실패 기준**
  - 식당 ID 미존재 → 404 Not Found
  - 내부 오류 → 500 Internal Server Error

---

## 2. 메뉴 생성 API (`POST /menu`)
- **성공 기준**
  - 사장 계정 인증 성공
  - 모든 필수 필드(이름, 가격, 옵션, 설명, 이미지) 유효성 통과
  - 새로운 버전 번호 자동 생성
  - 상태 `DRAFT` → `CONFIRMED` 전환 시 기존 메뉴 비활성화
- **실패 기준**
  - 인증 실패 → 401 Unauthorized
  - 필드 누락 → 400 Bad Request
  - DB 저장 실패 → 500 Internal Server Error

---

## 3. 주문 생성 API (`POST /order`)
- **성공 기준**
  - 유효한 메뉴 버전/옵션 선택
  - 가격 검증 통과
  - 주문 상태 `CREATED`로 생성
  - 결제 페이지 URL 반환
- **실패 기준**
  - 메뉴 버전 불일치 → 409 Conflict
  - 가격 불일치 → 422 Unprocessable Entity
  - 재고 없음 → 410 Gone

---

## 4. 주문 상태 조회 API (`GET /order/{orderId}`)
- **성공 기준**
  - 주문 ID 유효
  - 상태(예: CREATED, READY, COMPLETED) 반환
- **실패 기준**
  - 주문 ID 없음 → 404 Not Found

---

## 5. 주문 취소 API (`DELETE /order/{orderId}`)
- **성공 기준**
  - 조리 전: 전액 환불
  - 조리 후: 환불 비율 `REFUND_CAP_PERCENT` 적용
  - 결제 취소 성공
- **실패 기준**
  - 주문 상태 `COMPLETED` → 400 Bad Request
  - 환불 API 실패 → 502 Bad Gateway

---

## 6. POS 출력 API (`POST /pos/print`)
- **성공 기준**
  - 주문 ID 유효
  - POS 프린터로 ESC/POS 명령 전송 성공
- **실패 기준**
  - 프린터 연결 실패 → 503 Service Unavailable
  - 데이터 포맷 오류 → 422 Unprocessable Entity

---

## 7. POS 출력 상태 조회 API (`GET /pos/print/{jobId}`)
- **성공 기준**
  - 출력 작업 상태(PENDING, SUCCESS, FAILED) 반환
- **실패 기준**
  - 작업 ID 없음 → 404 Not Found

---

## 8. 재출력 API (`POST /pos/reprint`)
- **성공 기준**
  - 기존 주문 데이터 기반 재출력 성공
- **실패 기준**
  - 주문 데이터 없음 → 404 Not Found

---

## 9. 결제 콜백 처리 API
- **성공 기준**
  - 네이버페이/카카오페이 서명 검증 성공
  - 결제 상태 업데이트
- **실패 기준**
  - 서명 검증 실패 → 401 Unauthorized
  - DB 업데이트 실패 → 500 Internal Server Error

---

## 9. 카테고리 관리 API
- **성공 기준**
  - 카테고리 생성: 유효한 이름과 표시명 입력 시 새 카테고리 생성
  - 카테고리 조회: 레스토랑별 카테고리 목록 반환 (순서별 정렬)
  - 카테고리 수정: 표시명, 활성 상태, 순서 변경 가능
  - 카테고리 비활성화: 관련 메뉴 초안 상태 전환
- **실패 기준**
  - 레스토랑 ID 없음 → 404 Not Found
  - 카테고리 ID 없음 → 404 Not Found
  - 필수 필드 누락 → 400 Bad Request

---

## 10. 자동완료 처리
- **성공 기준**
  - READY 상태 이후 `AUTO_COMPLETE_MINUTES` 경과 시 `COMPLETED`로 상태 변경
  - 알림 발송
- **실패 기준**
  - 상태 변경 실패 → 500 Internal Server Error


# 부록 B: UI 설계 문서

## 1. 화면 목록 정의

### A. 일반 고객 (비로그인 - Mobile Ony Mode)
1. **메뉴 진입 화면**
   - QR 스캔 후 접근
   - 매장명 / 로고 표시
   - 메뉴판 진입 버튼
2. **메뉴판 화면**
   - 카테고리(메인/사이드/음료)
   - 메뉴명, 이미지, 가격, 옵션 선택 버튼
3. **옵션 선택 팝업/화면**
   - 사이즈/추가토핑/수량
   - 가격 자동 반영
4. **장바구니 화면**
   - 담은 메뉴 목록, 가격 합계
   - 수량 수정 / 삭제
   - “주문하기” 버튼
5. **주문 확인 화면**
   - 메뉴 상세(옵션 포함)
   - 최종 가격
   - 결제수단 선택(네이버페이/카카오페이)
6. **결제 진행 화면**
   - 결제 모듈 iFrame/리다이렉트
7. **주문 완료 화면**
   - 주문번호 표시
   - 상태조회 버튼
8. **주문 상태 조회 화면**
   - 상태: 준비중 / 조리중 / 완료 / 자동완료
   - 픽업 안내 메시지
   - 취소 버튼(READY 전까지)

### B. 음식점 사장 (로그인 필요 - PC & Mobile Mode)
1. **로그인 화면**
   - ID/PW 입력
   - 로그인 유지 체크
2. **메뉴 관리 메인 화면**
   - 현재 버전 메뉴 리스트
   - **카테고리 관리 버튼**
   - "새 버전 만들기" 버튼
3. **카테고리 관리 화면**
   - 카테고리 목록 (활성/비활성 상태 표시)
   - 카테고리 생성/편집 모달
   - 활성화/비활성화 토글
   - 카테고리 순서 변경
4. **메뉴 등록/편집 화면**
   - 이미지 업로드
   - 이름 / 설명 / 가격 / 옵션 입력
   - **카테고리 선택 드롭다운**
   - 저장 후 버전 확정 버튼
5. **주문 관리 화면**
   - 실시간 주문 목록
   - 주문번호 / 메뉴 / 금액 / 상태 표시
   - 조리 시작 / 취소 버튼
6. **주문 상세 화면**
   - 주문 메뉴 상세
   - POS 프린트 버튼
   - 조리 완료 / 픽업 완료 버튼
7. **판매 내역 화면**
   - 일자별 매출표
   - 결제 상세내역
   - 검색/필터

---

## 2. 화면별 구성요소 설명

### 고객 – 메뉴판 화면
- **상단바**: 매장명 / 뒤로가기
- **카테고리 탭**: 메인/사이드/음료
- **메뉴 카드**: 이미지, 이름, 가격, 옵션 버튼
- **하단 고정바**: 장바구니 버튼, 총금액 표시

### 고객 – 장바구니 화면
- **메뉴 리스트**: 썸네일, 이름, 옵션, 수량 조절
- **합계 금액**: 세부 계산 포함
- **버튼 영역**: “계속 쇼핑” / “주문하기”

### 사장 – 주문 관리 화면
- **주문 테이블**: 주문번호, 상태, 금액, 시간
- **액션 버튼**: 조리 시작, 취소
- **실시간 갱신**: WebSocket/SSE 기반

---

## 3. 화면 간 흐름 연결도 (High-Level Flow)

### 일반 고객
```
[메뉴 진입] 
  ↓
[메뉴판] → [옵션 선택] → [장바구니] → [주문 확인] 
  ↓                                            ↑
[결제 진행] → [주문 완료] → [상태 조회] ←─────┘
```

### 음식점 사장
```
[로그인] 
  ↓
[메뉴 관리] → [카테고리 관리] → [카테고리 생성/편집]
  ↓               ↓
[메뉴 등록/편집] → [버전 확정]
  ↓
[주문 관리] → [주문 상세] → [POS 출력] → [조리 완료]
  ↓
[판매 내역]
```