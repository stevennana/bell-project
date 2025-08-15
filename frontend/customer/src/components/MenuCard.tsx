import type { MenuItem } from '../types/api'

interface MenuCardProps {
  item: MenuItem
  onSelect: (item: MenuItem) => void
}

export default function MenuCard({ item, onSelect }: MenuCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
      onClick={() => onSelect(item)}
    >
      <div className="relative aspect-w-16 aspect-h-9 bg-gradient-to-br from-gray-100 to-gray-200">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 flex items-center justify-center">
            <span className="text-orange-400 text-5xl">🍽️</span>
          </div>
        )}
        
        {/* Availability overlay */}
        {!item.available && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="bg-red-500 text-white font-bold px-4 py-2 rounded-full text-sm shadow-lg">
              😔 품절
            </div>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-3 right-3">
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-3 py-1 shadow-md">
            <span className="text-orange-600 font-bold text-sm">
              {formatPrice(item.price)}원
            </span>
          </div>
        </div>

        {/* Options indicator */}
        {item.options.length > 0 && (
          <div className="absolute top-3 left-3">
            <div className="bg-blue-500 text-white rounded-full px-2 py-1 text-xs font-medium shadow-md">
              🎛️ 옵션
            </div>
          </div>
        )}
      </div>
      
      <div className="p-5">
        <div className="mb-3">
          <h3 className="font-bold text-gray-800 text-lg mb-2 group-hover:text-orange-600 transition-colors">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {formatPrice(item.price)}원
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {item.available ? (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                주문 가능 ✨
              </div>
            ) : (
              <div className="bg-gray-300 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                준비중 ⏰
              </div>
            )}
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span>⭐</span>
                <span>4.{Math.floor(Math.random() * 9) + 1}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>🕒</span>
                <span>{Math.floor(Math.random() * 10) + 5}분</span>
              </span>
            </div>
            {item.options.length > 0 && (
              <span className="text-blue-500 font-medium">
                {item.options.length}개 옵션 →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}