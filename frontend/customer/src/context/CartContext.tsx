import { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { CartItem } from '../types/api'

interface CartState {
  items: CartItem[]
  total: number
  restaurantId: string | null
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { menuItemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_RESTAURANT'; payload: string }

interface CartContextType {
  state: CartState
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  setRestaurant: (restaurantId: string) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const initialState: CartState = {
  items: [],
  total: 0,
  restaurantId: null,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => 
          item.menuItemId === action.payload.menuItemId &&
          JSON.stringify(item.selectedOptions) === JSON.stringify(action.payload.selectedOptions)
      )

      let newItems: CartItem[]
      if (existingItemIndex >= 0) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? {
                ...item,
                quantity: item.quantity + action.payload.quantity,
                totalPrice: (item.quantity + action.payload.quantity) * item.price
              }
            : item
        )
      } else {
        newItems = [...state.items, action.payload]
      }

      const total = newItems.reduce((sum, item) => sum + item.totalPrice, 0)
      return { ...state, items: newItems, total }
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.menuItemId !== action.payload)
      const total = newItems.reduce((sum, item) => sum + item.totalPrice, 0)
      return { ...state, items: newItems, total }
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.menuItemId === action.payload.menuItemId
          ? {
              ...item,
              quantity: action.payload.quantity,
              totalPrice: action.payload.quantity * item.price
            }
          : item
      ).filter(item => item.quantity > 0)

      const total = newItems.reduce((sum, item) => sum + item.totalPrice, 0)
      return { ...state, items: newItems, total }
    }

    case 'CLEAR_CART':
      return { ...state, items: [], total: 0 }

    case 'SET_RESTAURANT':
      return { ...state, restaurantId: action.payload }

    default:
      return state
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }, [])

  const removeItem = useCallback((menuItemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: menuItemId })
  }, [])

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId, quantity } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [])

  const setRestaurant = useCallback((restaurantId: string) => {
    dispatch({ type: 'SET_RESTAURANT', payload: restaurantId })
  }, [])

  const contextValue = useMemo(() => ({
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setRestaurant,
  }), [state, addItem, removeItem, updateQuantity, clearCart, setRestaurant])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}