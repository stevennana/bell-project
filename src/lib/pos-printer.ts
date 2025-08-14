import { OrderRecord } from '../types/database';

export class ESCPOSFormatter {
  private buffer: Buffer[] = [];

  private write(data: string | Buffer): void {
    if (typeof data === 'string') {
      this.buffer.push(Buffer.from(data, 'utf8'));
    } else {
      this.buffer.push(data);
    }
  }

  private writeCommand(command: number[]): void {
    this.buffer.push(Buffer.from(command));
  }

  initialize(): void {
    this.writeCommand([0x1B, 0x40]); // ESC @
  }

  setFontSize(size: 'normal' | 'large'): void {
    if (size === 'large') {
      this.writeCommand([0x1D, 0x21, 0x11]); // GS ! 17
    } else {
      this.writeCommand([0x1D, 0x21, 0x00]); // GS ! 00
    }
  }

  setBold(enabled: boolean): void {
    if (enabled) {
      this.writeCommand([0x1B, 0x45, 0x01]); // ESC E 1
    } else {
      this.writeCommand([0x1B, 0x45, 0x00]); // ESC E 0
    }
  }

  setAlign(align: 'left' | 'center' | 'right'): void {
    const alignCodes = {
      left: 0x00,
      center: 0x01,
      right: 0x02
    };
    this.writeCommand([0x1B, 0x61, alignCodes[align]]); // ESC a
  }

  writeLine(text: string): void {
    this.write(text + '\n');
  }

  writeEmptyLine(): void {
    this.write('\n');
  }

  writeSeparator(char: string = '-', width: number = 32): void {
    this.write(char.repeat(width) + '\n');
  }

  cutPaper(): void {
    this.writeCommand([0x1D, 0x56, 0x42, 0x00]); // GS V B 0
  }

  openCashDrawer(): void {
    this.writeCommand([0x1B, 0x70, 0x00, 0x19, 0xFA]); // ESC p
  }

  getBuffer(): Buffer {
    return Buffer.concat(this.buffer);
  }

  clear(): void {
    this.buffer = [];
  }
}

export function formatOrderReceipt(order: OrderRecord): Buffer {
  const printer = new ESCPOSFormatter();
  
  printer.initialize();
  printer.setAlign('center');
  printer.setFontSize('large');
  printer.setBold(true);
  printer.writeLine('ORDER RECEIPT');
  printer.writeEmptyLine();
  
  printer.setFontSize('normal');
  printer.setBold(false);
  printer.setAlign('left');
  printer.writeLine(`Order #: ${order.orderId.substring(0, 8).toUpperCase()}`);
  printer.writeLine(`Date: ${new Date(order.createdAt).toLocaleString('ko-KR')}`);
  printer.writeLine(`Status: ${order.status}`);
  
  if (order.customerInfo?.phone) {
    printer.writeLine(`Phone: ${order.customerInfo.phone}`);
  }
  
  printer.writeEmptyLine();
  printer.writeSeparator();
  printer.writeEmptyLine();
  
  printer.setBold(true);
  printer.writeLine('ITEMS:');
  printer.setBold(false);
  printer.writeEmptyLine();
  
  let totalAmount = 0;
  for (const item of order.items) {
    printer.writeLine(`${item.name} x${item.quantity}`);
    
    if (item.selectedOptions.length > 0) {
      for (const option of item.selectedOptions) {
        const modifier = option.priceModifier > 0 ? `+${option.priceModifier}` : `${option.priceModifier}`;
        printer.writeLine(`  - ${option.name} (${modifier})`);
      }
    }
    
    const itemTotal = item.price;
    printer.writeLine(`  ${formatCurrency(itemTotal)}`);
    printer.writeEmptyLine();
    totalAmount += itemTotal;
  }
  
  printer.writeSeparator();
  printer.writeEmptyLine();
  printer.setBold(true);
  printer.setFontSize('large');
  printer.writeLine(`TOTAL: ${formatCurrency(totalAmount)}`);
  
  if (order.paymentInfo) {
    printer.setFontSize('normal');
    printer.writeLine(`Payment: ${order.paymentInfo.method.toUpperCase()}`);
    printer.writeLine(`Paid: ${formatCurrency(order.paymentInfo.amount)}`);
  }
  
  printer.writeEmptyLine();
  printer.writeEmptyLine();
  printer.setAlign('center');
  printer.setBold(false);
  printer.setFontSize('normal');
  printer.writeLine('Thank you for your order!');
  printer.writeEmptyLine();
  printer.writeEmptyLine();
  
  printer.cutPaper();
  
  return printer.getBuffer();
}

export function formatKitchenTicket(order: OrderRecord): Buffer {
  const printer = new ESCPOSFormatter();
  
  printer.initialize();
  printer.setAlign('center');
  printer.setFontSize('large');
  printer.setBold(true);
  printer.writeLine('KITCHEN TICKET');
  printer.writeEmptyLine();
  
  printer.setFontSize('normal');
  printer.setBold(false);
  printer.setAlign('left');
  printer.writeLine(`Order #: ${order.orderId.substring(0, 8).toUpperCase()}`);
  printer.writeLine(`Time: ${new Date(order.createdAt).toLocaleString('ko-KR')}`);
  printer.writeEmptyLine();
  printer.writeSeparator();
  printer.writeEmptyLine();
  
  for (const item of order.items) {
    printer.setBold(true);
    printer.setFontSize('large');
    printer.writeLine(`${item.name} x${item.quantity}`);
    printer.setFontSize('normal');
    printer.setBold(false);
    
    if (item.selectedOptions.length > 0) {
      for (const option of item.selectedOptions) {
        printer.writeLine(`  * ${option.name}`);
      }
    }
    printer.writeEmptyLine();
  }
  
  if (order.customerInfo?.phone) {
    printer.writeSeparator();
    printer.writeEmptyLine();
    printer.writeLine(`Customer: ${order.customerInfo.phone}`);
  }
  
  printer.writeEmptyLine();
  printer.writeEmptyLine();
  printer.cutPaper();
  
  return printer.getBuffer();
}

function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export async function sendToPOSPrinter(printData: Buffer, printerEndpoint?: string): Promise<void> {
  if (!printerEndpoint) {
    console.log('No POS printer endpoint configured, printing to console:');
    console.log('--- POS PRINT START ---');
    console.log(printData.toString('ascii'));
    console.log('--- POS PRINT END ---');
    return;
  }

  try {
    const response = await fetch(printerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Print-Type': 'ESCPOS'
      },
      body: printData
    });

    if (!response.ok) {
      throw new Error(`POS printer request failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send to POS printer:', error);
    throw error;
  }
}