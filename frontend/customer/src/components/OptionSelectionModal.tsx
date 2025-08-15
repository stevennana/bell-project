import { useState } from 'react'
import type { MenuItem, SelectedOption, MenuOption, OptionChoice } from '../types/api'

interface OptionSelectionModalProps {
  item: MenuItem
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedOptions: SelectedOption[], quantity: number) => void
}

export default function OptionSelectionModal({ item, isOpen, onClose, onConfirm }: OptionSelectionModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  const [quantity, setQuantity] = useState(1)

  if (!isOpen) return null

  const handleOptionSelect = (option: MenuOption, choice: OptionChoice) => {
    setSelectedOptions(prev => {
      const existing = prev.find(so => so.optionId === option.id)
      if (existing) {
        return prev.map(so =>
          so.optionId === option.id
            ? { optionId: option.id, choiceId: choice.id, priceModifier: choice.priceModifier }
            : so
        )
      } else {
        return [...prev, { optionId: option.id, choiceId: choice.id, priceModifier: choice.priceModifier }]
      }
    })
  }

  const getSelectedChoice = (optionId: string): string | null => {
    const selected = selectedOptions.find(so => so.optionId === optionId)
    return selected?.choiceId || null
  }

  const calculateTotalPrice = () => {
    const optionPrice = selectedOptions.reduce((sum, option) => sum + option.priceModifier, 0)
    return (item.price + optionPrice) * quantity
  }

  const isValid = () => {
    const requiredOptions = item.options.filter(option => option.required)
    return requiredOptions.every(option => 
      selectedOptions.some(selected => selected.optionId === option.id)
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const handleConfirm = () => {
    if (isValid()) {
      onConfirm(selectedOptions, quantity)
      setSelectedOptions([])
      setQuantity(1)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center modal-overlay">
      <div className="bg-white w-full max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-fade-in-up">
        {/* Enhanced Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <h2 className="text-xl font-bold">{item.name}</h2>
              <p className="text-orange-100 text-sm">옵션을 선택해주세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <span className="text-white text-xl">✕</span>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Enhanced Image Display */}
          {item.image && (
            <div className="relative">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-56 object-cover rounded-2xl shadow-lg"
              />
              <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-orange-600 font-bold text-sm">
                  기본 {formatPrice(item.price)}원
                </span>
              </div>
            </div>
          )}

          {/* Enhanced Description */}
          {item.description && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-2xl border-l-4 border-orange-400">
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Enhanced Options */}
          {item.options.map(option => (
            <div key={option.id} className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-xl">⚙️</span>
                <h3 className="font-bold text-gray-800 text-lg">
                  {option.name}
                  {option.required && (
                    <span className="text-red-500 ml-2 text-sm bg-red-50 px-2 py-1 rounded-full">
                      필수
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="space-y-3">
                {option.choices.map(choice => (
                  <label
                    key={choice.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      getSelectedChoice(option.id) === choice.id
                        ? 'border-orange-400 bg-orange-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name={option.id}
                        value={choice.id}
                        checked={getSelectedChoice(option.id) === choice.id}
                        onChange={() => handleOptionSelect(option, choice)}
                        className="w-5 h-5 text-orange-500 border-2 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="font-medium text-gray-800">{choice.name}</span>
                    </div>
                    {choice.priceModifier !== 0 && (
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        choice.priceModifier > 0 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {choice.priceModifier > 0 ? '+' : ''}{formatPrice(choice.priceModifier)}원
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Enhanced Quantity Selector */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">📦</span>
              <h3 className="font-bold text-gray-800 text-lg">수량</h3>
            </div>
            <div className="flex items-center justify-center space-x-6 bg-gray-50 p-4 rounded-2xl">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 hover:border-orange-400 hover:bg-orange-50 transition-all shadow-sm"
              >
                <span className="text-xl font-bold text-gray-600">−</span>
              </button>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">{quantity}</div>
                <div className="text-sm text-gray-500">개</div>
              </div>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-orange-400 hover:bg-orange-50 transition-all shadow-sm"
              >
                <span className="text-xl font-bold text-gray-600">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Bottom Action */}
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-100 p-6">
          <div className="mb-4 bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">총 금액</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {formatPrice(calculateTotalPrice())}원
              </span>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!isValid()}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${
              isValid()
                ? 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isValid() ? (
              <span className="flex items-center justify-center space-x-2">
                <span>🛒</span>
                <span>장바구니에 담기</span>
                <span>→</span>
              </span>
            ) : (
              <span>필수 옵션을 선택해주세요</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}