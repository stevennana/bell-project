# Bell Restaurant - Customer Frontend

QR 기반 음식점 주문 시스템의 고객용 프론트엔드입니다.

## 🚀 기능

### 📱 모바일 최적화
- QR 코드 스캔 후 접근하는 웹앱
- 터치 친화적인 UI/UX
- iOS/Android 호환
- 반응형 디자인

### 🍽️ 주요 기능
- **메뉴 진입**: QR 스캔 후 매장 정보 확인
- **메뉴 탐색**: 카테고리별 메뉴 조회 및 검색
- **옵션 선택**: 사이즈, 토핑 등 세부 옵션 선택
- **장바구니**: 주문 수량 조절 및 총액 확인
- **주문 확인**: 고객 정보 입력 및 최종 확인
- **결제**: 네이버페이/카카오페이 연동
- **상태 추적**: 실시간 주문 상태 확인

## 🛠️ 기술 스택

- **Framework**: React 19 + TypeScript
- **Styling**: TailwindCSS 4
- **Routing**: React Router DOM 7
- **State Management**: Context API + useReducer
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Build Tool**: Vite 7
- **Package Manager**: npm

## 📱 화면 구성

### 고객 화면 플로우
```
QR 스캔 → 메뉴 진입 → 메뉴판 → 옵션 선택 → 장바구니 → 주문 확인 → 결제 → 완료 → 상태 추적
```

### 주요 화면
1. **메뉴 진입** (`/restaurant/:id`)
2. **메뉴판** (`/restaurant/:id/menu`)
3. **장바구니** (`/restaurant/:id/cart`)
4. **주문 확인** (`/restaurant/:id/order-confirmation`)
5. **결제** (`/restaurant/:id/payment`)
6. **주문 완료** (`/restaurant/:id/order-complete/:orderId`)
7. **상태 추적** (`/restaurant/:id/order-status/:orderId`)

## 🚀 개발 환경 설정

### 필수 조건
- Node.js 18+
- npm 9+

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (포트 3001)
npm run dev

# 빌드
npm run build

# 프리뷰
npm run preview

# 린트
npm run lint
```

### 환경 변수
`.env.local` 파일 설정:
```env
VITE_API_BASE_URL=http://localhost:3000/dev
VITE_APP_NAME=Bell Restaurant
VITE_APP_VERSION=1.0.0
VITE_PAYMENT_SANDBOX=true
```

## 📁 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── MenuCard.tsx
│   └── OptionSelectionModal.tsx
├── context/            # React Context
│   └── CartContext.tsx
├── hooks/              # 커스텀 훅
├── pages/              # 페이지 컴포넌트
│   ├── MenuEntryPage.tsx
│   ├── MenuPage.tsx
│   ├── CartPage.tsx
│   ├── OrderConfirmationPage.tsx
│   ├── PaymentPage.tsx
│   ├── OrderCompletePage.tsx
│   └── OrderStatusPage.tsx
├── services/           # API 서비스
│   └── api.ts
├── types/              # TypeScript 타입 정의
│   └── api.ts
├── utils/              # 유틸리티 함수
│   └── index.ts
├── App.tsx             # 메인 앱 컴포넌트
└── main.tsx            # 앱 진입점
```

## 🎨 UI/UX 특징

### 모바일 최적화
- 44px 최소 터치 타겟
- 스와이프 제스처 지원
- 네이티브 스크롤 경험
- iOS Safe Area 대응

### 접근성
- ARIA 라벨링
- 키보드 네비게이션
- 포커스 관리
- 고대비 지원

### 성능 최적화
- 이미지 지연 로딩
- 컴포넌트 메모이제이션
- API 응답 캐싱
- 번들 크기 최적화

## 🔗 API 연동

백엔드 API와의 통신을 위한 서비스 레이어:

```typescript
// 메뉴 조회
const menu = await menuApi.getMenu(restaurantId)

// 주문 생성
const order = await orderApi.createOrder({
  restaurantId,
  items,
  customerInfo
})

// 결제 시작
const payment = await paymentApi.initiatePayment(orderId, 'NAVERPAY')
```

## 📱 PWA 기능

- 오프라인 지원 (서비스 워커)
- 홈 화면 추가
- 푸시 알림 (주문 상태 업데이트)
- 백그라운드 동기화

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:coverage
```

## 🚀 배포

### 빌드 최적화
- Tree shaking
- 코드 스플리팅
- 이미지 최적화
- CSS 압축

### 배포 환경
- **개발**: Vite dev server
- **스테이징**: AWS S3 + CloudFront
- **프로덕션**: AWS S3 + CloudFront

## 📋 주요 의존성

```json
{
  "react": "^19.1.1",
  "react-router-dom": "^7.8.0",
  "@tanstack/react-query": "^5.85.2",
  "axios": "^1.11.0",
  "tailwindcss": "^4.1.11"
}
```

## 🐛 트러블슈팅

### 일반적인 문제
1. **API 연결 실패**: 환경 변수 확인
2. **라우팅 오류**: React Router 설정 확인
3. **스타일링 문제**: TailwindCSS 빌드 확인

### 디버깅
- React DevTools
- Network 탭 확인
- Console 로그 활용
