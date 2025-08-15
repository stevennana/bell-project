import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { orderApi } from '../services/api'
import type { OrderStatus } from '../types/api'

export default function OrderStatusPage() {
  const { restaurantId, orderId } = useParams<{ restaurantId: string; orderId: string }>()
  const navigate = useNavigate()
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderId ? orderApi.getOrder(orderId) : Promise.reject('No order ID'),
    enabled: !!orderId,
    refetchInterval: 10000, // 10초마다 폴링
  })

  const cancelOrderMutation = useMutation({
    mutationFn: orderApi.cancelOrder,
    onSuccess: () => {
      refetch()
      alert('주문이 취소되었습니다.')
    },
    onError: () => {
      alert('주문 취소에 실패했습니다.')
    },
  })

  useEffect(() => {
    setLastUpdated(new Date())
  }, [order])

  const getStatusInfo = (status: OrderStatus) => {
    const statusMap = {
      CREATED: { text: '주문 접수', color: 'bg-blue-500', icon: '📝' },
      PAYMENT_PENDING: { text: '결제 대기', color: 'bg-yellow-500', icon: '💳' },
      PAID: { text: '결제 완료', color: 'bg-green-500', icon: '✅' },
      COOKING: { text: '조리 중', color: 'bg-orange-500', icon: '👨‍🍳' },
      READY: { text: '픽업 대기', color: 'bg-purple-500', icon: '🛎️' },
      COMPLETED: { text: '완료', color: 'bg-gray-500', icon: '✅' },
      CANCELLED: { text: '취소됨', color: 'bg-red-500', icon: '❌' },
    }
    return statusMap[status] || { text: status, color: 'bg-gray-500', icon: '?' }
  }

  const getStatusProgress = (status: OrderStatus) => {
    const progress = {
      CREATED: 1,
      PAYMENT_PENDING: 1,
      PAID: 2,
      COOKING: 3,
      READY: 4,
      COMPLETED: 5,
      CANCELLED: 0,
    }
    return progress[status] || 0
  }

  const canCancel = (status: OrderStatus) => {
    return ['CREATED', 'PAYMENT_PENDING', 'PAID'].includes(status)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const handleCancel = () => {
    if (!orderId || !order) return
    
    const confirmCancel = window.confirm('주문을 취소하시겠습니까?')
    if (confirmCancel) {
      cancelOrderMutation.mutate(orderId)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">주문 정보를 불러오는데 실패했습니다.</p>
          <button
            onClick={() => refetch()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg mr-2"
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg"
          >
            메뉴로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const progress = getStatusProgress(order.status)

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">주문 상태</h1>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            🔄
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center mb-6">
            <div className={`w-20 h-20 ${statusInfo.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <span className="text-white text-3xl">{statusInfo.icon}</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">{statusInfo.text}</h2>
            <p className="text-gray-600">주문번호: {order.orderId}</p>
          </div>

          {order.status !== 'CANCELLED' && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>주문접수</span>
                <span>결제완료</span>
                <span>조리중</span>
                <span>픽업대기</span>
                <span>완료</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(progress / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {order.status === 'READY' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-purple-800 mb-2">🛎️ 픽업 준비 완료!</h3>
              <p className="text-purple-700 text-sm">주문하신 음식이 준비되었습니다. 매장에서 픽업해주세요.</p>
            </div>
          )}

          {order.status === 'COMPLETED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ 주문 완료</h3>
              <p className="text-green-700 text-sm">주문이 완료되었습니다. 이용해 주셔서 감사합니다!</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-4">주문 상세</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{item.name}</h4>
                  <p className="text-sm text-gray-600">수량: {item.quantity}개</p>
                </div>
                <span className="font-semibold text-gray-800">
                  {formatPrice(item.totalPrice)}원
                </span>
              </div>
            ))}
          </div>
          
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between text-xl font-semibold">
              <span>총 금액</span>
              <span className="text-indigo-600">{formatPrice(order.totalAmount)}원</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-4">주문 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">주문 시간</span>
              <span>{new Date(order.createdAt).toLocaleString('ko-KR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">마지막 업데이트</span>
              <span>{lastUpdated.toLocaleString('ko-KR')}</span>
            </div>
            {order.paymentInfo && (
              <div className="flex justify-between">
                <span className="text-gray-600">결제 방법</span>
                <span>{order.paymentInfo.method === 'NAVERPAY' ? '네이버페이' : '카카오페이'}</span>
              </div>
            )}
          </div>
        </div>

        {canCancel(order.status) && (
          <button
            onClick={handleCancel}
            disabled={cancelOrderMutation.isPending}
            className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {cancelOrderMutation.isPending ? '취소 처리 중...' : '주문 취소'}
          </button>
        )}

        <button
          onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          추가 주문하기
        </button>
      </main>
    </div>
  )
}