"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postPosReprintSchema = exports.postPosPrintSchema = exports.postOrderSchema = exports.orderItemSchema = exports.selectedOptionSchema = exports.postMenuSchema = exports.menuItemSchema = void 0;
exports.validatePostMenu = validatePostMenu;
exports.validatePostOrder = validatePostOrder;
exports.validatePostPosPrint = validatePostPosPrint;
exports.validatePostPosReprint = validatePostPosReprint;
exports.validateRestaurantId = validateRestaurantId;
exports.validateOrderId = validateOrderId;
exports.validateRequired = validateRequired;
exports.validatePrice = validatePrice;
exports.validateQuantity = validateQuantity;
const joi_1 = __importDefault(require("joi"));
exports.menuItemSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    name: joi_1.default.string().min(1).max(100).required(),
    description: joi_1.default.string().max(500).optional(),
    price: joi_1.default.number().min(0).required(),
    imageUrl: joi_1.default.string().uri().optional(),
    available: joi_1.default.boolean().default(true),
    options: joi_1.default.array().items(joi_1.default.object({
        id: joi_1.default.string().required(),
        name: joi_1.default.string().min(1).max(50).required(),
        type: joi_1.default.string().valid('size', 'addon', 'choice').required(),
        required: joi_1.default.boolean().default(false),
        choices: joi_1.default.array().items(joi_1.default.object({
            id: joi_1.default.string().required(),
            name: joi_1.default.string().min(1).max(50).required(),
            priceModifier: joi_1.default.number().required()
        })).min(1).required()
    })).default([])
});
exports.postMenuSchema = joi_1.default.object({
    items: joi_1.default.array().items(exports.menuItemSchema).min(1).required()
});
exports.selectedOptionSchema = joi_1.default.object({
    optionId: joi_1.default.string().required(),
    choiceId: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    priceModifier: joi_1.default.number().required()
});
exports.orderItemSchema = joi_1.default.object({
    menuItemId: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    price: joi_1.default.number().min(0).required(),
    quantity: joi_1.default.number().min(1).max(99).required(),
    selectedOptions: joi_1.default.array().items(exports.selectedOptionSchema).default([])
});
exports.postOrderSchema = joi_1.default.object({
    restaurantId: joi_1.default.string().required(),
    items: joi_1.default.array().items(exports.orderItemSchema).min(1).required(),
    customerInfo: joi_1.default.object({
        phone: joi_1.default.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).optional(),
        email: joi_1.default.string().email().optional()
    }).optional()
});
exports.postPosPrintSchema = joi_1.default.object({
    orderId: joi_1.default.string().uuid().required()
});
exports.postPosReprintSchema = joi_1.default.object({
    orderId: joi_1.default.string().uuid().required()
});
function validatePostMenu(data) {
    const { error, value } = exports.postMenuSchema.validate(data, { abortEarly: false });
    if (error) {
        return { error: error.details.map(d => d.message).join(', ') };
    }
    return { value };
}
function validatePostOrder(data) {
    const { error, value } = exports.postOrderSchema.validate(data, { abortEarly: false });
    if (error) {
        return { error: error.details.map(d => d.message).join(', ') };
    }
    return { value };
}
function validatePostPosPrint(data) {
    const { error, value } = exports.postPosPrintSchema.validate(data, { abortEarly: false });
    if (error) {
        return { error: error.details.map(d => d.message).join(', ') };
    }
    return { value };
}
function validatePostPosReprint(data) {
    const { error, value } = exports.postPosReprintSchema.validate(data, { abortEarly: false });
    if (error) {
        return { error: error.details.map(d => d.message).join(', ') };
    }
    return { value };
}
function validateRestaurantId(restaurantId) {
    if (!restaurantId || typeof restaurantId !== 'string') {
        return false;
    }
    return restaurantId.trim().length > 0;
}
function validateOrderId(orderId) {
    if (!orderId || typeof orderId !== 'string') {
        return false;
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(orderId);
}
function validateRequired(value, fieldName) {
    if (value === null || value === undefined || value === '') {
        return `${fieldName} is required`;
    }
    return null;
}
function validatePrice(price) {
    if (typeof price !== 'number') {
        return 'Price must be a number';
    }
    if (price < 0) {
        return 'Price cannot be negative';
    }
    if (!Number.isFinite(price)) {
        return 'Price must be a valid finite number';
    }
    if (Math.round(price * 100) / 100 !== price) {
        return 'Price can only have up to 2 decimal places';
    }
    return null;
}
function validateQuantity(quantity) {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
        return 'Quantity must be an integer';
    }
    if (quantity < 1) {
        return 'Quantity must be at least 1';
    }
    if (quantity > 99) {
        return 'Quantity cannot exceed 99';
    }
    return null;
}
//# sourceMappingURL=validation.js.map