export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  available: boolean;
  options: MenuOption[];
}

export interface MenuOption {
  id: string;
  name: string;
  required: boolean;
  choices: OptionChoice[];
}

export interface OptionChoice {
  id: string;
  name: string;
  priceModifier: number;
}

export interface Menu {
  restaurantId: string;
  version: string;
  items: MenuItem[];
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  totalPrice: number;
}

export interface SelectedOption {
  optionId: string;
  choiceId: string;
  priceModifier: number;
}

export interface Order {
  orderId: string;
  restaurantId: string;
  items: CartItem[];
  customerInfo: CustomerInfo;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  paymentInfo?: PaymentInfo;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

export type OrderStatus = 'CREATED' | 'PAYMENT_PENDING' | 'PAID' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface PaymentInfo {
  method: 'NAVERPAY' | 'KAKAOPAY';
  transactionId: string;
  paidAt: string;
  amount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}