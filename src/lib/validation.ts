import Joi from 'joi';
import { 
  PostMenuRequest, 
  PostOrderRequest, 
  PostPosPrintRequest,
  PostPosReprintRequest 
} from '../types/api';

// Menu validation schemas
export const menuItemSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  price: Joi.number().min(0).required(),
  imageUrl: Joi.string().uri().optional(),
  available: Joi.boolean().default(true),
  options: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().min(1).max(50).required(),
      type: Joi.string().valid('size', 'addon', 'choice').required(),
      required: Joi.boolean().default(false),
      choices: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          name: Joi.string().min(1).max(50).required(),
          priceModifier: Joi.number().required()
        })
      ).min(1).required()
    })
  ).default([])
});

export const postMenuSchema = Joi.object({
  items: Joi.array().items(menuItemSchema).min(1).required()
});

// Order validation schemas
export const selectedOptionSchema = Joi.object({
  optionId: Joi.string().required(),
  choiceId: Joi.string().required(),
  name: Joi.string().required(),
  priceModifier: Joi.number().required()
});

export const orderItemSchema = Joi.object({
  menuItemId: Joi.string().required(),
  name: Joi.string().required(),
  price: Joi.number().min(0).required(),
  quantity: Joi.number().min(1).max(99).required(),
  selectedOptions: Joi.array().items(selectedOptionSchema).default([])
});

export const postOrderSchema = Joi.object({
  restaurantId: Joi.string().required(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  customerInfo: Joi.object({
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).optional(),
    email: Joi.string().email().optional()
  }).optional()
});

// POS validation schemas
export const postPosPrintSchema = Joi.object({
  orderId: Joi.string().uuid().required()
});

export const postPosReprintSchema = Joi.object({
  orderId: Joi.string().uuid().required()
});

// Validation functions
export function validatePostMenu(data: any): { error?: string; value?: PostMenuRequest } {
  const { error, value } = postMenuSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return { error: error.details.map(d => d.message).join(', ') };
  }
  
  return { value };
}

export function validatePostOrder(data: any): { error?: string; value?: PostOrderRequest } {
  const { error, value } = postOrderSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return { error: error.details.map(d => d.message).join(', ') };
  }
  
  return { value };
}

export function validatePostPosPrint(data: any): { error?: string; value?: PostPosPrintRequest } {
  const { error, value } = postPosPrintSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return { error: error.details.map(d => d.message).join(', ') };
  }
  
  return { value };
}

export function validatePostPosReprint(data: any): { error?: string; value?: PostPosReprintRequest } {
  const { error, value } = postPosReprintSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return { error: error.details.map(d => d.message).join(', ') };
  }
  
  return { value };
}

// Restaurant ID validation
export function validateRestaurantId(restaurantId: string | null | undefined): boolean {
  if (!restaurantId || typeof restaurantId !== 'string') {
    return false;
  }
  
  // Restaurant ID should be a non-empty string, possibly UUID format
  return restaurantId.trim().length > 0;
}

// Order ID validation (UUID format)
export function validateOrderId(orderId: string | null | undefined): boolean {
  if (!orderId || typeof orderId !== 'string') {
    return false;
  }
  
  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(orderId);
}

// Generic validation helper
export function validateRequired(value: any, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

// Price validation helper
export function validatePrice(price: any): string | null {
  if (typeof price !== 'number') {
    return 'Price must be a number';
  }
  
  if (price < 0) {
    return 'Price cannot be negative';
  }
  
  if (!Number.isFinite(price)) {
    return 'Price must be a valid finite number';
  }
  
  // Round to 2 decimal places for currency
  if (Math.round(price * 100) / 100 !== price) {
    return 'Price can only have up to 2 decimal places';
  }
  
  return null;
}

// Quantity validation helper
export function validateQuantity(quantity: any): string | null {
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