import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { paymentApi } from '../services/api'

export default function PaymentPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'processing' | 'success' | 'failed'>('loading')
  
  const { orderId, paymentMethod } = location.state || {}

  const initiatePaymentMutation = useMutation({
    mutationFn: ({ orderId, method }: { orderId: string; method: 'NAVERPAY' | 'KAKAOPAY' }) =>
      paymentApi.initiatePayment(orderId, method),
    onSuccess: (data) => {
      setPaymentStatus('processing')
      window.location.href = data.paymentUrl
    },
    onError: () => {
      setPaymentStatus('failed')
    },
  })

  useEffect(() => {
    if (!orderId || !paymentMethod) {
      navigate(`/restaurant/${restaurantId}/menu`)
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const paymentId = urlParams.get('paymentId')
    const status = urlParams.get('status')

    if (paymentId && status === 'success') {
      setPaymentStatus('success')
      setTimeout(() => {
        navigate(`/restaurant/${restaurantId}/order-complete/${orderId}`)
      }, 2000)
    } else if (status === 'failed') {
      setPaymentStatus('failed')
    } else {
      initiatePaymentMutation.mutate({ orderId, method: paymentMethod })
    }
  }, [orderId, paymentMethod, navigate, restaurantId, initiatePaymentMutation])

  const handleRetry = () => {
    if (orderId && paymentMethod) {
      setPaymentStatus('loading')
      initiatePaymentMutation.mutate({ orderId, method: paymentMethod })
    }
  }

  const getPaymentMethodName = (method: string) => {
    return method === 'NAVERPAY' ? '네이버페이' : '카카오페이'
  }

  const getPaymentIcon = (method: string) => {
    return method === 'NAVERPAY' ? (
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xl font-bold">N</span>
      </div>
    ) : (
      <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
        <span className="text-black text-xl font-bold">K</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md w-full">
        {paymentStatus === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">결제 준비 중</h2>
            <p className="text-gray-600">잠시만 기다려주세요...</p>
          </>
        )}

        {paymentStatus === 'processing' && paymentMethod && (
          <>
            {getPaymentIcon(paymentMethod)}
            <h2 className="text-2xl font-semibold text-gray-800 mb-2 mt-6">
              {getPaymentMethodName(paymentMethod)} 결제
            </h2>
            <p className="text-gray-600 mb-6">결제 페이지로 이동 중입니다...</p>
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </>
        )}

        {paymentStatus === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">결제 완료</h2>
            <p className="text-gray-600 mb-6">주문이 성공적으로 접수되었습니다</p>
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </>
        )}

        {paymentStatus === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">✕</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">결제 실패</h2>
            <p className="text-gray-600 mb-6">결제 처리 중 오류가 발생했습니다</p>
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={() => navigate(`/restaurant/${restaurantId}/order-confirmation`)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                주문 확인으로 돌아가기
              </button>
            </div>
          </>
        )}

        {orderId && (
          <p className="text-xs text-gray-500 mt-6">
            주문번호: {orderId}
          </p>
        )}
      </div>
    </div>
  )
}