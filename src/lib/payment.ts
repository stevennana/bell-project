import crypto from 'crypto';
import axios from 'axios';
import {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  PaymentCallbackData,
  RefundResponse,
  NaverPayConfig,
  KakaoPayConfig,
  NaverPayCallbackData,
  KakaoPayCallbackData
} from '../types/payment';

export class NaverPayProvider implements PaymentProvider {
  name: 'naverpay' = 'naverpay';
  private config: NaverPayConfig;

  constructor(config: NaverPayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymentData = {
      merchantPayKey: request.orderId,
      productName: request.productName,
      totalPayAmount: request.amount,
      returnUrl: request.returnUrl,
      merchantUserKey: request.customerInfo?.phone || request.orderId
    };

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/payments/v2.0/reserve`,
        paymentData,
        {
          headers: {
            'X-Naver-Client-Id': this.config.clientId,
            'X-Naver-Client-Secret': this.config.clientSecret,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        paymentUrl: response.data.body.paymentUrl,
        transactionId: response.data.body.paymentId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };
    } catch (error) {
      console.error('NaverPay createPayment error:', error);
      throw new Error('Failed to create NaverPay payment');
    }
  }

  async verifyCallback(callback: PaymentCallbackData): Promise<boolean> {
    try {
      const naverPayData = callback.rawData as NaverPayCallbackData;
      
      const expectedSignature = crypto
        .createHmac('sha256', this.config.clientSecret)
        .update(`${naverPayData.paymentId}${naverPayData.merchantPayKey}${naverPayData.admissionYmdt}`)
        .digest('hex');

      return callback.signature === expectedSignature;
    } catch (error) {
      console.error('NaverPay verifyCallback error:', error);
      return false;
    }
  }

  async cancelPayment(transactionId: string, amount: number): Promise<RefundResponse> {
    const cancelData = {
      paymentId: transactionId,
      cancelAmount: amount,
      cancelReason: 'Customer requested cancellation'
    };

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/payments/v2.0/cancel`,
        cancelData,
        {
          headers: {
            'X-Naver-Client-Id': this.config.clientId,
            'X-Naver-Client-Secret': this.config.clientSecret,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        refundId: response.data.body.payHistId,
        amount: response.data.body.cancelAmount,
        status: response.data.body.admissionState === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('NaverPay cancelPayment error:', error);
      throw new Error('Failed to cancel NaverPay payment');
    }
  }
}

export class KakaoPayProvider implements PaymentProvider {
  name: 'kakaopay' = 'kakaopay';
  private config: KakaoPayConfig;

  constructor(config: KakaoPayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymentData = {
      cid: this.config.cid,
      partner_order_id: request.orderId,
      partner_user_id: request.customerInfo?.phone || request.orderId,
      item_name: request.productName,
      quantity: '1',
      total_amount: request.amount.toString(),
      tax_free_amount: '0',
      approval_url: request.returnUrl,
      cancel_url: request.cancelUrl,
      fail_url: request.cancelUrl
    };

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/v1/payment/ready`,
        new URLSearchParams(paymentData).toString(),
        {
          headers: {
            'Authorization': `KakaoAK ${this.config.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        paymentUrl: response.data.next_redirect_pc_url,
        transactionId: response.data.tid,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };
    } catch (error) {
      console.error('KakaoPay createPayment error:', error);
      throw new Error('Failed to create KakaoPay payment');
    }
  }

  async verifyCallback(callback: PaymentCallbackData): Promise<boolean> {
    try {
      // KakaoPay doesn't provide signature verification in the same way
      // Instead, we should verify the payment status by calling their API
      const kakaoPayData = callback.rawData as KakaoPayCallbackData;
      
      const verifyData = {
        cid: this.config.cid,
        tid: kakaoPayData.tid,
        partner_order_id: callback.orderId,
        partner_user_id: callback.rawData.partner_user_id || callback.orderId
      };

      const response = await axios.post(
        `${this.config.baseUrl}/v1/payment/order`,
        new URLSearchParams(verifyData).toString(),
        {
          headers: {
            'Authorization': `KakaoAK ${this.config.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data.status === 'SUCCESS_PAYMENT';
    } catch (error) {
      console.error('KakaoPay verifyCallback error:', error);
      return false;
    }
  }

  async cancelPayment(transactionId: string, amount: number): Promise<RefundResponse> {
    const cancelData = {
      cid: this.config.cid,
      tid: transactionId,
      cancel_amount: amount.toString(),
      cancel_tax_free_amount: '0'
    };

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/v1/payment/cancel`,
        new URLSearchParams(cancelData).toString(),
        {
          headers: {
            'Authorization': `KakaoAK ${this.config.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        refundId: response.data.tid,
        amount: response.data.canceled_amount.total,
        status: 'SUCCESS',
        processedAt: response.data.canceled_at
      };
    } catch (error) {
      console.error('KakaoPay cancelPayment error:', error);
      throw new Error('Failed to cancel KakaoPay payment');
    }
  }
}

export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    // Initialize payment providers based on environment variables
    if (process.env.NAVERPAY_CLIENT_ID && process.env.NAVERPAY_CLIENT_SECRET) {
      const naverPayConfig: NaverPayConfig = {
        clientId: process.env.NAVERPAY_CLIENT_ID,
        clientSecret: process.env.NAVERPAY_CLIENT_SECRET,
        mode: (process.env.NAVERPAY_MODE as 'development' | 'production') || 'development',
        baseUrl: process.env.NAVERPAY_BASE_URL || 'https://dev.apis.naver.com/naverpay-partner'
      };
      this.providers.set('naverpay', new NaverPayProvider(naverPayConfig));
    }

    if (process.env.KAKAOPAY_CID && process.env.KAKAOPAY_SECRET_KEY) {
      const kakaoPayConfig: KakaoPayConfig = {
        cid: process.env.KAKAOPAY_CID,
        secretKey: process.env.KAKAOPAY_SECRET_KEY,
        mode: (process.env.KAKAOPAY_MODE as 'development' | 'production') || 'development',
        baseUrl: process.env.KAKAOPAY_BASE_URL || 'https://kapi.kakao.com'
      };
      this.providers.set('kakaopay', new KakaoPayProvider(kakaoPayConfig));
    }
  }

  getProvider(providerName: string): PaymentProvider | null {
    return this.providers.get(providerName) || null;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async createPayment(providerName: string, request: PaymentRequest): Promise<PaymentResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Payment provider ${providerName} not configured`);
    }

    return await provider.createPayment(request);
  }

  async verifyCallback(callback: PaymentCallbackData): Promise<boolean> {
    const provider = this.getProvider(callback.provider);
    if (!provider) {
      throw new Error(`Payment provider ${callback.provider} not configured`);
    }

    return await provider.verifyCallback(callback);
  }

  async cancelPayment(providerName: string, transactionId: string, amount: number): Promise<RefundResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Payment provider ${providerName} not configured`);
    }

    return await provider.cancelPayment(transactionId, amount);
  }
}

export const paymentService = new PaymentService();