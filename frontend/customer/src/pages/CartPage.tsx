import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function CartPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const navigate = useNavigate()
  const { state: cartState, updateQuantity, removeItem, clearCart } = useCart()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const getOptionText = (item: any) => {
    if (item.selectedOptions.length === 0) return null
    return item.selectedOptions.map((option: any) => option.name || '옵션').join(', ')
  }

  const handleQuantityChange = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(menuItemId)
    } else {
      updateQuantity(menuItemId, newQuantity)
    }
  }

  const handleProceedToOrder = () => {
    navigate(`/restaurant/${restaurantId}/order-confirmation`)
  }

  if (cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
                장바구니
              </h1>
              <p className="text-xs text-gray-500">주문할 메뉴를 담아보세요</p>
            </div>
            <div className="w-12"></div>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">장바구니가 비어있어요</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              맛있는 메뉴를 골라서<br />
              장바구니에 담아보세요!
            </p>
            <button
              onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>🍽️</span>
              <span>메뉴 보러가기</span>
              <span>→</span>
            </button>
          </div>
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
              장바구니
            </h1>
            <p className="text-xs text-gray-500">
              {cartState.items.reduce((sum, item) => sum + item.quantity, 0)}개 상품
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-red-500 font-semibold px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
          >
            전체삭제
          </button>
        </div>
      </header>

      <main className="p-4">
        <div className="space-y-4">
          {cartState.items.map((item, index) => (
            <div key={`${item.menuItemId}-${index}`} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg mb-2">{item.name}</h3>
                  {getOptionText(item) && (
                    <div className="bg-orange-50 rounded-lg px-3 py-1 mb-3">
                      <p className="text-sm text-orange-700">
                        <span className="font-medium">옵션:</span> {getOptionText(item)}
                      </p>
                    </div>
                  )}
                  <p className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    개당 {formatPrice(item.price)}원
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.menuItemId)}
                  className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors"
                >
                  <span className="text-lg">🗑️</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleQuantityChange(item.menuItemId, item.quantity - 1)}
                    className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-orange-400 hover:bg-orange-50 transition-all shadow-sm"
                  >
                    <span className="text-lg font-bold">−</span>
                  </button>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{item.quantity}</div>
                    <div className="text-xs text-gray-500">개</div>
                  </div>
                  <button
                    onClick={() => handleQuantityChange(item.menuItemId, item.quantity + 1)}
                    className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-orange-400 hover:bg-orange-50 transition-all shadow-sm"
                  >
                    <span className="text-lg font-bold">+</span>
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">소계</div>
                  <div className="text-xl font-bold text-gray-800">
                    {formatPrice(item.totalPrice)}원
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-2xl">📋</span>
            <h3 className="text-xl font-bold text-gray-800">주문 요약</h3>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>상품 합계</span>
              <span className="font-medium">{formatPrice(cartState.total)}원</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>포장비</span>
              <span className="font-medium text-green-600">무료 🆓</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>서비스비</span>
              <span className="font-medium text-green-600">무료 🎁</span>
            </div>
          </div>
          
          <div className="border-t-2 border-gray-100 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg text-gray-700">총 결제금액</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {formatPrice(cartState.total)}원
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
          className="w-full mt-6 bg-white border-2 border-orange-200 text-orange-600 py-4 rounded-2xl font-bold hover:bg-orange-50 transition-colors flex items-center justify-center space-x-2"
        >
          <span>🍽️</span>
          <span>메뉴 더보기</span>
          <span>+</span>
        </button>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
          <button
            onClick={handleProceedToOrder}
            className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span>💳</span>
            <span>주문하기</span>
            <span className="bg-white bg-opacity-25 px-3 py-1 rounded-full text-sm">
              {formatPrice(cartState.total)}원
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}