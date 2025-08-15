import { useParams, useNavigate } from 'react-router-dom'

export default function OrderCompletePage() {
  const { restaurantId, orderId } = useParams<{ restaurantId: string; orderId: string }>()
  const navigate = useNavigate()

  const handleCheckStatus = () => {
    navigate(`/restaurant/${restaurantId}/order-status/${orderId}`)
  }

  const handleNewOrder = () => {
    navigate(`/restaurant/${restaurantId}/menu`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-3xl">✓</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">주문 완료!</h1>
        <p className="text-gray-600 mb-8">주문이 성공적으로 접수되었습니다</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <h3 className="font-semibold text-gray-800 mb-3">주문 정보</h3>
          <div className="text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">주문번호</span>
              <span className="font-medium">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">상태</span>
              <span className="text-green-600 font-medium">접수 완료</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📱 상태 확인</h4>
            <p className="text-sm text-blue-700">주문 상태를 실시간으로 확인하세요</p>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-4">
            <h4 className="font-semibold text-orange-800 mb-2">🔔 픽업 알림</h4>
            <p className="text-sm text-orange-700">준비 완료 시 알림을 보내드려요</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCheckStatus}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            주문 상태 확인
          </button>
          
          <button
            onClick={handleNewOrder}
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            추가 주문하기
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          주문 접수 시간: {new Date().toLocaleString('ko-KR')}
        </p>
      </div>
    </div>
  )
}