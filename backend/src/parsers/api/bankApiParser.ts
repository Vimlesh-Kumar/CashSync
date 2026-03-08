import { ParsedTransactionPayload } from '../sms/bankParser';

/**
 * Future: bank API provider adapters (Plaid / Salt Edge / open banking providers).
 * Keep this parser contract stable so ingestion workers can deduplicate uniformly.
 */
export function parseBankApiPayload(_payload: unknown): ParsedTransactionPayload | null {
    // TODO: map provider-specific payload into ParsedTransactionPayload.
    // Example future shape:
    // const payload = _payload as { amount: number; merchant_name: string; datetime: string; transaction_id: string };
    // return {
    //   amount: payload.amount,
    //   type: payload.amount > 0 ? 'INCOME' : 'EXPENSE',
    //   merchant: payload.merchant_name,
    //   transactionId: payload.transaction_id,
    //   timestamp: new Date(payload.datetime),
    //   source: 'API',
    //   raw: JSON.stringify(payload),
    // };
    return null;
}
