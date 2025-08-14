import { PaymentProvider, PaymentRequest, PaymentResponse, PaymentCallbackData, RefundResponse, NaverPayConfig, KakaoPayConfig } from '../types/payment';
export declare class NaverPayProvider implements PaymentProvider {
    name: 'naverpay';
    private config;
    constructor(config: NaverPayConfig);
    createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    verifyCallback(callback: PaymentCallbackData): Promise<boolean>;
    cancelPayment(transactionId: string, amount: number): Promise<RefundResponse>;
}
export declare class KakaoPayProvider implements PaymentProvider {
    name: 'kakaopay';
    private config;
    constructor(config: KakaoPayConfig);
    createPayment(request: PaymentRequest): Promise<PaymentResponse>;
    verifyCallback(callback: PaymentCallbackData): Promise<boolean>;
    cancelPayment(transactionId: string, amount: number): Promise<RefundResponse>;
}
export declare class PaymentService {
    private providers;
    constructor();
    getProvider(providerName: string): PaymentProvider | null;
    getAvailableProviders(): string[];
    createPayment(providerName: string, request: PaymentRequest): Promise<PaymentResponse>;
    verifyCallback(callback: PaymentCallbackData): Promise<boolean>;
    cancelPayment(providerName: string, transactionId: string, amount: number): Promise<RefundResponse>;
}
export declare const paymentService: PaymentService;
//# sourceMappingURL=payment.d.ts.map