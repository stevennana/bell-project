"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = exports.KakaoPayProvider = exports.NaverPayProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
class NaverPayProvider {
    constructor(config) {
        this.name = 'naverpay';
        this.config = config;
    }
    async createPayment(request) {
        const paymentData = {
            merchantPayKey: request.orderId,
            productName: request.productName,
            totalPayAmount: request.amount,
            returnUrl: request.returnUrl,
            merchantUserKey: request.customerInfo?.phone || request.orderId
        };
        try {
            const response = await axios_1.default.post(`${this.config.baseUrl}/payments/v2.0/reserve`, paymentData, {
                headers: {
                    'X-Naver-Client-Id': this.config.clientId,
                    'X-Naver-Client-Secret': this.config.clientSecret,
                    'Content-Type': 'application/json'
                }
            });
            return {
                paymentUrl: response.data.body.paymentUrl,
                transactionId: response.data.body.paymentId,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            };
        }
        catch (error) {
            console.error('NaverPay createPayment error:', error);
            throw new Error('Failed to create NaverPay payment');
        }
    }
    async verifyCallback(callback) {
        try {
            const naverPayData = callback.rawData;
            const expectedSignature = crypto_1.default
                .createHmac('sha256', this.config.clientSecret)
                .update(`${naverPayData.paymentId}${naverPayData.merchantPayKey}${naverPayData.admissionYmdt}`)
                .digest('hex');
            return callback.signature === expectedSignature;
        }
        catch (error) {
            console.error('NaverPay verifyCallback error:', error);
            return false;
        }
    }
    async cancelPayment(transactionId, amount) {
        const cancelData = {
            paymentId: transactionId,
            cancelAmount: amount,
            cancelReason: 'Customer requested cancellation'
        };
        try {
            const response = await axios_1.default.post(`${this.config.baseUrl}/payments/v2.0/cancel`, cancelData, {
                headers: {
                    'X-Naver-Client-Id': this.config.clientId,
                    'X-Naver-Client-Secret': this.config.clientSecret,
                    'Content-Type': 'application/json'
                }
            });
            return {
                refundId: response.data.body.payHistId,
                amount: response.data.body.cancelAmount,
                status: response.data.body.admissionState === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
                processedAt: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('NaverPay cancelPayment error:', error);
            throw new Error('Failed to cancel NaverPay payment');
        }
    }
}
exports.NaverPayProvider = NaverPayProvider;
class KakaoPayProvider {
    constructor(config) {
        this.name = 'kakaopay';
        this.config = config;
    }
    async createPayment(request) {
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
            const response = await axios_1.default.post(`${this.config.baseUrl}/v1/payment/ready`, new URLSearchParams(paymentData).toString(), {
                headers: {
                    'Authorization': `KakaoAK ${this.config.secretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return {
                paymentUrl: response.data.next_redirect_pc_url,
                transactionId: response.data.tid,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            };
        }
        catch (error) {
            console.error('KakaoPay createPayment error:', error);
            throw new Error('Failed to create KakaoPay payment');
        }
    }
    async verifyCallback(callback) {
        try {
            const kakaoPayData = callback.rawData;
            const verifyData = {
                cid: this.config.cid,
                tid: kakaoPayData.tid,
                partner_order_id: callback.orderId,
                partner_user_id: callback.rawData.partner_user_id || callback.orderId
            };
            const response = await axios_1.default.post(`${this.config.baseUrl}/v1/payment/order`, new URLSearchParams(verifyData).toString(), {
                headers: {
                    'Authorization': `KakaoAK ${this.config.secretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data.status === 'SUCCESS_PAYMENT';
        }
        catch (error) {
            console.error('KakaoPay verifyCallback error:', error);
            return false;
        }
    }
    async cancelPayment(transactionId, amount) {
        const cancelData = {
            cid: this.config.cid,
            tid: transactionId,
            cancel_amount: amount.toString(),
            cancel_tax_free_amount: '0'
        };
        try {
            const response = await axios_1.default.post(`${this.config.baseUrl}/v1/payment/cancel`, new URLSearchParams(cancelData).toString(), {
                headers: {
                    'Authorization': `KakaoAK ${this.config.secretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return {
                refundId: response.data.tid,
                amount: response.data.canceled_amount.total,
                status: 'SUCCESS',
                processedAt: response.data.canceled_at
            };
        }
        catch (error) {
            console.error('KakaoPay cancelPayment error:', error);
            throw new Error('Failed to cancel KakaoPay payment');
        }
    }
}
exports.KakaoPayProvider = KakaoPayProvider;
class PaymentService {
    constructor() {
        this.providers = new Map();
        if (process.env.NAVERPAY_CLIENT_ID && process.env.NAVERPAY_CLIENT_SECRET) {
            const naverPayConfig = {
                clientId: process.env.NAVERPAY_CLIENT_ID,
                clientSecret: process.env.NAVERPAY_CLIENT_SECRET,
                mode: process.env.NAVERPAY_MODE || 'development',
                baseUrl: process.env.NAVERPAY_BASE_URL || 'https://dev.apis.naver.com/naverpay-partner'
            };
            this.providers.set('naverpay', new NaverPayProvider(naverPayConfig));
        }
        if (process.env.KAKAOPAY_CID && process.env.KAKAOPAY_SECRET_KEY) {
            const kakaoPayConfig = {
                cid: process.env.KAKAOPAY_CID,
                secretKey: process.env.KAKAOPAY_SECRET_KEY,
                mode: process.env.KAKAOPAY_MODE || 'development',
                baseUrl: process.env.KAKAOPAY_BASE_URL || 'https://kapi.kakao.com'
            };
            this.providers.set('kakaopay', new KakaoPayProvider(kakaoPayConfig));
        }
    }
    getProvider(providerName) {
        return this.providers.get(providerName) || null;
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    async createPayment(providerName, request) {
        const provider = this.getProvider(providerName);
        if (!provider) {
            throw new Error(`Payment provider ${providerName} not configured`);
        }
        return await provider.createPayment(request);
    }
    async verifyCallback(callback) {
        const provider = this.getProvider(callback.provider);
        if (!provider) {
            throw new Error(`Payment provider ${callback.provider} not configured`);
        }
        return await provider.verifyCallback(callback);
    }
    async cancelPayment(providerName, transactionId, amount) {
        const provider = this.getProvider(providerName);
        if (!provider) {
            throw new Error(`Payment provider ${providerName} not configured`);
        }
        return await provider.cancelPayment(transactionId, amount);
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
//# sourceMappingURL=payment.js.map