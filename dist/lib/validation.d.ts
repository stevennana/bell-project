import Joi from 'joi';
import { PostMenuRequest, PostOrderRequest, PostPosPrintRequest, PostPosReprintRequest } from '../types/api';
export declare const menuItemSchema: Joi.ObjectSchema<any>;
export declare const postMenuSchema: Joi.ObjectSchema<any>;
export declare const selectedOptionSchema: Joi.ObjectSchema<any>;
export declare const orderItemSchema: Joi.ObjectSchema<any>;
export declare const postOrderSchema: Joi.ObjectSchema<any>;
export declare const postPosPrintSchema: Joi.ObjectSchema<any>;
export declare const postPosReprintSchema: Joi.ObjectSchema<any>;
export declare function validatePostMenu(data: any): {
    error?: string;
    value?: PostMenuRequest;
};
export declare function validatePostOrder(data: any): {
    error?: string;
    value?: PostOrderRequest;
};
export declare function validatePostPosPrint(data: any): {
    error?: string;
    value?: PostPosPrintRequest;
};
export declare function validatePostPosReprint(data: any): {
    error?: string;
    value?: PostPosReprintRequest;
};
export declare function validateRestaurantId(restaurantId: string | null | undefined): boolean;
export declare function validateOrderId(orderId: string | null | undefined): boolean;
export declare function validateRequired(value: any, fieldName: string): string | null;
export declare function validatePrice(price: any): string | null;
export declare function validateQuantity(quantity: any): string | null;
//# sourceMappingURL=validation.d.ts.map