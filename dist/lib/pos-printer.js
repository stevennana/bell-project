"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESCPOSFormatter = void 0;
exports.formatOrderReceipt = formatOrderReceipt;
exports.formatKitchenTicket = formatKitchenTicket;
exports.sendToPOSPrinter = sendToPOSPrinter;
class ESCPOSFormatter {
    constructor() {
        this.buffer = [];
    }
    write(data) {
        if (typeof data === 'string') {
            this.buffer.push(Buffer.from(data, 'utf8'));
        }
        else {
            this.buffer.push(data);
        }
    }
    writeCommand(command) {
        this.buffer.push(Buffer.from(command));
    }
    initialize() {
        this.writeCommand([0x1B, 0x40]);
    }
    setFontSize(size) {
        if (size === 'large') {
            this.writeCommand([0x1D, 0x21, 0x11]);
        }
        else {
            this.writeCommand([0x1D, 0x21, 0x00]);
        }
    }
    setBold(enabled) {
        if (enabled) {
            this.writeCommand([0x1B, 0x45, 0x01]);
        }
        else {
            this.writeCommand([0x1B, 0x45, 0x00]);
        }
    }
    setAlign(align) {
        const alignCodes = {
            left: 0x00,
            center: 0x01,
            right: 0x02
        };
        this.writeCommand([0x1B, 0x61, alignCodes[align]]);
    }
    writeLine(text) {
        this.write(text + '\n');
    }
    writeEmptyLine() {
        this.write('\n');
    }
    writeSeparator(char = '-', width = 32) {
        this.write(char.repeat(width) + '\n');
    }
    cutPaper() {
        this.writeCommand([0x1D, 0x56, 0x42, 0x00]);
    }
    openCashDrawer() {
        this.writeCommand([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    }
    getBuffer() {
        return Buffer.concat(this.buffer);
    }
    clear() {
        this.buffer = [];
    }
}
exports.ESCPOSFormatter = ESCPOSFormatter;
function formatOrderReceipt(order) {
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
function formatKitchenTicket(order) {
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
function formatCurrency(amount) {
    return `₩${amount.toLocaleString('ko-KR')}`;
}
async function sendToPOSPrinter(printData, printerEndpoint) {
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
    }
    catch (error) {
        console.error('Failed to send to POS printer:', error);
        throw error;
    }
}
//# sourceMappingURL=pos-printer.js.map