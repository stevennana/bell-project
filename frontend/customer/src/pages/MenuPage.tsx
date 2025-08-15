import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { MenuItem, SelectedOption } from '../types/api'
import { menuApi } from '../services/api'
import { useCart } from '../context/CartContext'
import MenuCard from '../components/MenuCard'
import OptionSelectionModal from '../components/OptionSelectionModal'

export default function MenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const navigate = useNavigate()
  const { state: cartState, addItem } = useCart()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: menu, isLoading, error } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => restaurantId ? menuApi.getMenu(restaurantId) : Promise.reject('No restaurant ID'),
    enabled: !!restaurantId,
  })

  const categories = menu?.items ? ['all', ...new Set(menu.items.map(item => item.category))] : ['all']
  const filteredItems = menu?.items?.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  ) || []

  const handleItemSelect = (item: MenuItem) => {
    if (!item.available) return
    
    if (item.options.length > 0) {
      setSelectedItem(item)
      setIsModalOpen(true)
    } else {
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        selectedOptions: [],
        totalPrice: item.price,
      })
    }
  }

  const handleOptionConfirm = (selectedOptions: SelectedOption[], quantity: number) => {
    if (!selectedItem) return

    const optionPrice = selectedOptions.reduce((sum, option) => sum + option.priceModifier, 0)
    const totalPrice = (selectedItem.price + optionPrice) * quantity

    addItem({
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price + optionPrice,
      quantity,
      selectedOptions,
      totalPrice,
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const getCategoryDisplayName = (category: string) => {
    const categoryNames: Record<string, string> = {
      all: '전체',
      main: '메인',
      burgers: '버거',
      burger: '버거',
      side: '사이드',
      sides: '사이드',
      drink: '음료',
      drinks: '음료',
      beverage: '음료',
      beverages: '음료',
      dessert: '디저트',
      desserts: '디저트',
      appetizer: '애피타이저',
      appetizers: '애피타이저',
      pasta: '파스타',
      pizza: '피자',
      salad: '샐러드',
      salads: '샐러드'
    }
    return categoryNames[category.toLowerCase()] || category
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">메뉴를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">메뉴를 불러오는데 실패했습니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* Enhanced Header */}
      <header className="bg-white shadow-lg sticky top-0 z-40 border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors duration-200 flex items-center justify-center"
          >
            <span className="text-xl">←</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Bell Restaurant
            </h1>
            <p className="text-xs text-gray-500">메뉴판</p>
          </div>
          <div className="w-12"></div>
        </div>
      </header>

      {/* Enhanced Category Filter */}
      <div className="sticky top-16 bg-white z-30 border-b border-gray-200 shadow-sm">
        <div className="flex overflow-x-auto scrollbar-hide p-4 space-x-3">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-6 py-3 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              {getCategoryDisplayName(category)}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <main className="p-4">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredItems.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                onSelect={handleItemSelect}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl text-gray-400">🍽️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">메뉴가 없습니다</h3>
            <p className="text-gray-500 mb-4">선택한 카테고리에 표시할 메뉴가 없습니다.</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors"
            >
              전체 메뉴 보기
            </button>
          </div>
        )}
      </main>

      {/* Enhanced Cart Button */}
      {cartState.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
            <button
              onClick={() => navigate(`/restaurant/${restaurantId}/cart`)}
              className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <span className="text-xl">🛒</span>
                <span>장바구니</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-25 px-3 py-1 rounded-full">
                  <span className="text-sm font-bold">
                    {cartState.items.reduce((sum, item) => sum + item.quantity, 0)}개
                  </span>
                </div>
                <span className="font-bold">{formatPrice(cartState.total)}원</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedItem && (
        <OptionSelectionModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedItem(null)
          }}
          onConfirm={handleOptionConfirm}
        />
      )}
    </div>
  )
}