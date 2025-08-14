import { OrderRecord } from '../types/database';
export declare class ESCPOSFormatter {
    private buffer;
    private write;
    private writeCommand;
    initialize(): void;
    setFontSize(size: 'normal' | 'large'): void;
    setBold(enabled: boolean): void;
    setAlign(align: 'left' | 'center' | 'right'): void;
    writeLine(text: string): void;
    writeEmptyLine(): void;
    writeSeparator(char?: string, width?: number): void;
    cutPaper(): void;
    openCashDrawer(): void;
    getBuffer(): Buffer;
    clear(): void;
}
export declare function formatOrderReceipt(order: OrderRecord): Buffer;
export declare function formatKitchenTicket(order: OrderRecord): Buffer;
export declare function sendToPOSPrinter(printData: Buffer, printerEndpoint?: string): Promise<void>;
//# sourceMappingURL=pos-printer.d.ts.map