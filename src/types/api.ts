export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  options: MenuOption[];
  available: boolean;
}

export interface MenuOption {
  id: string;
  name: string;
  type: 'size' | 'addon' | 'choice';
  required: boolean;
  choices: OptionChoice[];
}

export interface OptionChoice {
  id: string;
  name: string;
  priceModifier: number;
}

export interface MenuVersion {
  restaurantId: string;
  version: string;
  items: MenuItem[];
  status: 'DRAFT' | 'CONFIRMED';
  createdAt: string;
  confirmedAt?: string;
}

export interface GetMenuResponse {
  menu: MenuVersion;
}

export interface PostMenuRequest {
  items: MenuItem[];
}

export interface PostMenuResponse {
  version: string;
  status: 'DRAFT' | 'CONFIRMED';
  createdAt: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions: SelectedOption[];
}

export interface SelectedOption {
  optionId: string;
  choiceId: string;
  name: string;
  priceModifier: number;
}

export interface PostOrderRequest {
  restaurantId: string;
  items: OrderItem[];
  customerInfo?: {
    phone?: string;
    email?: string;
  };
}

export interface PostOrderResponse {
  orderId: string;
  status: 'CREATED';
  totalAmount: number;
  paymentUrl: string;
  createdAt: string;
}

export interface GetOrderResponse {
  orderId: string;
  restaurantId: string;
  status: 'CREATED' | 'PAID' | 'CONFIRMED' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  paymentInfo?: {
    method: string;
    transactionId: string;
    paidAt: string;
  };
}

export interface DeleteOrderResponse {
  orderId: string;
  status: 'CANCELLED';
  refundAmount: number;
  refundMethod: string;
}

export interface PostPosPrintRequest {
  orderId: string;
}

export interface PostPosPrintResponse {
  jobId: string;
  status: 'PENDING';
  createdAt: string;
}

export interface GetPosPrintResponse {
  jobId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface PostPosReprintRequest {
  orderId: string;
}

export interface PaymentCallbackRequest {
  orderId: string;
  transactionId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  timestamp: string;
  signature: string;
  [key: string]: any;
}

export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
  headers: { [key: string]: string };
  body: string | null;
  requestContext: {
    requestId: string;
    stage: string;
    accountId: string;
  };
}

export interface GetDashboardStatsResponse {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  avgOrderTime: number;
  pendingOrders: number;
}

export type OrderStatus = 'CREATED' | 'PAID' | 'CONFIRMED' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface Order {
  orderId: string;
  restaurantId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  paymentInfo?: {
    method: string;
    transactionId: string;
    paidAt: string;
  };
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}