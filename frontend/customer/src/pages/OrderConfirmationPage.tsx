import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useCart } from '../context/CartContext'
import { orderApi } from '../services/api'
import type { CustomerInfo } from '../types/api'

export default function OrderConfirmationPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const navigate = useNavigate()
  const { state: cartState, clearCart } = useCart()
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
  })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'NAVERPAY' | 'KAKAOPAY' | null>(null)

  const createOrderMutation = useMutation({
    mutationFn: orderApi.createOrder,
    onSuccess: (order) => {
      clearCart()
      navigate(`/restaurant/${restaurantId}/payment`, { 
        state: { 
          orderId: order.orderId, 
          paymentMethod: selectedPaymentMethod 
        } 
      })
    },
    onError: (error) => {
      console.error('Order creation failed:', error)
      alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
    },
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const isFormValid = () => {
    return (
      customerInfo.name.trim() !== '' &&
      customerInfo.phone.trim() !== '' &&
      selectedPaymentMethod !== null &&
      cartState.items.length > 0
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFormValid() || !restaurantId) {
      return
    }

    createOrderMutation.mutate({
      restaurantId,
      items: cartState.items,
      customerInfo,
    })
  }

  const getOptionText = (item: any) => {
    if (item.selectedOptions.length === 0) return null
    return item.selectedOptions.map((option: any) => option.name || '옵션').join(', ')
  }

  if (cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">장바구니가 비어있습니다</h2>
          <p className="text-gray-600 mb-6">메뉴를 먼저 선택해주세요</p>
          <button
            onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            메뉴 보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-32">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              주문 확인
            </h1>
            <p className="text-xs text-gray-500">결제 전 마지막 확인</p>
          </div>
          <div className="w-12"></div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4">주문 상품</h2>
          <div className="space-y-3">
            {cartState.items.map((item, index) => (
              <div key={`${item.menuItemId}-${index}`} className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  {getOptionText(item) && (
                    <p className="text-sm text-gray-600">{getOptionText(item)}</p>
                  )}
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
              <span className="text-indigo-600">{formatPrice(cartState.total)}원</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4">주문자 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="이름을 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="010-1234-5678"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 (선택)
              </label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4">결제 수단</h2>
          <div className="space-y-3">
            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="NAVERPAY"
                checked={selectedPaymentMethod === 'NAVERPAY'}
                onChange={(e) => setSelectedPaymentMethod(e.target.value as 'NAVERPAY')}
                className="mr-3 text-green-600"
              />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded mr-3 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">N</span>
                </div>
                <span className="font-medium">네이버페이</span>
              </div>
            </label>
            
            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="KAKAOPAY"
                checked={selectedPaymentMethod === 'KAKAOPAY'}
                onChange={(e) => setSelectedPaymentMethod(e.target.value as 'KAKAOPAY')}
                className="mr-3 text-yellow-600"
              />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-400 rounded mr-3 flex items-center justify-center">
                  <span className="text-black text-xs font-bold">K</span>
                </div>
                <span className="font-medium">카카오페이</span>
              </div>
            </label>
          </div>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid() || createOrderMutation.isPending}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createOrderMutation.isPending ? '주문 생성 중...' : `결제하기 · ${formatPrice(cartState.total)}원`}
        </button>
      </div>
    </div>
  )
}