export interface PaymentProvider {
    name: 'naverpay' | 'kakaopay';
    createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    verifyCallback(callback: PaymentCallbackData): Promise<boolean>;
    cancelPayment(transactionId: string, amount: number): Promise<RefundResponse>;
}
export interface PaymentRequest {
    orderId: string;
    amount: number;
    productName: string;
    customerInfo?: {
        phone?: string;
        email?: string;
    };
    returnUrl: string;
    cancelUrl: string;
}
export interface PaymentResponse {
    paymentUrl: string;
    transactionId: string;
    expiresAt: string;
}
export interface PaymentCallbackData {
    orderId: string;
    transactionId: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
    timestamp: string;
    signature: string;
    provider: 'naverpay' | 'kakaopay';
    rawData: {
        [key: string]: any;
    };
}
export interface RefundResponse {
    refundId: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    processedAt: string;
    errorMessage?: string;
}
export interface NaverPayConfig {
    clientId: string;
    clientSecret: string;
    mode: 'development' | 'production';
    baseUrl: string;
}
export interface KakaoPayConfig {
    cid: string;
    secretKey: string;
    mode: 'development' | 'production';
    baseUrl: string;
}
export interface NaverPayCallbackData {
    paymentId: string;
    merchantPayKey: string;
    merchantUserKey?: string;
    admissionYmdt: string;
    admissionState: string;
    tradeConfirmYmdt?: string;
    payHistId: string;
    merchantId: string;
    admissionTypeCode: string;
    [key: string]: any;
}
export interface KakaoPayCallbackData {
    tid: string;
    partner_order_id: string;
    partner_user_id?: string;
    payment_method_type: string;
    amount: {
        total: number;
        tax_free: number;
        vat: number;
        point: number;
        discount: number;
        green_deposit: number;
    };
    created_at: string;
    approved_at: string;
    [key: string]: any;
}
//# sourceMappingURL=payment.d.ts.map