/**
 * MyFatoorah (الكويت) — تكامل مكتوب حسب التوثيق الرسمي (v2):
 *   POST /v2/SendPayment       ← إنشاء فاتورة ورابط دفع مستضاف (لا نرى بيانات البطاقة)
 *   POST /v2/GetPaymentStatus  ← الحالة الموثوقة خادم-لخادم بمفتاح API
 * بيئة الاختبار: https://apitest.myfatoorah.com
 *
 * ⚠️ لم يُختبر مع خادم MyFatoorah الحقيقي بعد (لا يوجد مفتاح Sandbox) — اختبارات الوحدة تحاكي fetch فقط.
 *
 * الأمان: لا نثق بمحتوى الـ Webhook ولا برابط العودة. كلاهما مجرد "منبّه":
 * نستخرج رقم الفاتورة/الدفع ثم نسأل MyFatoorah مباشرة عن الحالة والمبلغ (GetPaymentStatus).
 * لذلك إشعار مزوّر لا يستطيع تأكيد دفعة لم تتم.
 */
import { decimalToFils, filsToDecimal } from "../commission";
import type {
  CreateSessionInput,
  CreateSessionResult,
  IncomingNotification,
  PaymentProvider,
  VerifiedPaymentStatus,
} from "../types";

type FetchLike = typeof fetch;

type StatusResponse = {
  IsSuccess: boolean;
  Message?: string;
  Data?: {
    InvoiceId: number;
    InvoiceStatus: string;
    InvoiceValue: number;
    CustomerReference?: string | null;
    UserDefinedField?: string | null;
    InvoiceDisplayValue?: string;
    InvoiceTransactions?: {
      PaymentId?: string;
      TransactionStatus?: string;
      PaidCurrency?: string;
      PaidCurrencyValue?: string | number;
      TotalServiceCharge?: string | number;
      Error?: string | null;
    }[];
  };
};

export function createMyFatoorahProvider(options: {
  apiKey: string;
  baseUrl: string;
  fetch?: FetchLike;
}): PaymentProvider & { statusByInvoice(invoiceId: string): Promise<VerifiedPaymentStatus | null> } {
  const http = options.fetch ?? fetch;
  const base = options.baseUrl.replace(/\/+$/, "");

  async function call<T>(path: string, body: unknown): Promise<T> {
    const res = await http(`${base}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as T & { IsSuccess?: boolean; Message?: string };
    if (!res.ok || json.IsSuccess === false) {
      throw new Error(`MyFatoorah ${path} failed: ${res.status} ${json.Message ?? ""}`.trim());
    }
    return json;
  }

  async function status(
    key: string,
    keyType: "InvoiceId" | "PaymentId",
  ): Promise<VerifiedPaymentStatus | null> {
    const res = await call<StatusResponse>("/v2/GetPaymentStatus", { Key: key, KeyType: keyType });
    const d = res.Data;
    if (!d?.CustomerReference) return null;
    const tx =
      d.InvoiceTransactions?.find(
        (t) => t.TransactionStatus === "Succss" || t.TransactionStatus === "Success",
      ) ?? d.InvoiceTransactions?.at(-1);
    const invoiceStatus = d.InvoiceStatus?.toLowerCase();
    const mapped: VerifiedPaymentStatus["status"] =
      invoiceStatus === "paid"
        ? "paid"
        : invoiceStatus === "canceled" || invoiceStatus === "cancelled"
          ? "cancelled"
          : tx?.TransactionStatus?.toLowerCase() === "failed"
            ? "failed"
            : "pending";
    let fee: number | null = null;
    try {
      fee = tx?.TotalServiceCharge !== undefined ? decimalToFils(String(tx.TotalServiceCharge)) : null;
    } catch {
      fee = null;
    }
    return {
      status: mapped,
      paymentId: d.CustomerReference,
      sessionId: String(d.InvoiceId),
      amountFils: decimalToFils(d.InvoiceValue),
      currency: "KWD",
      gatewayFeeFils: fee,
      failureReason: mapped === "failed" ? (tx?.Error ?? "failed") : undefined,
      raw: d,
    };
  }

  return {
    name: "myfatoorah",

    async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
      const res = await call<{ Data: { InvoiceId: number; InvoiceURL: string } }>("/v2/SendPayment", {
        CustomerName: input.customerName.slice(0, 100) || "Customer",
        NotificationOption: "LNK",
        InvoiceValue: filsToDecimal(input.amountFils),
        DisplayCurrencyIso: input.currency,
        CustomerEmail: input.customerEmail ?? undefined,
        CallBackUrl: input.callbackUrl,
        ErrorUrl: input.errorUrl,
        Language: input.locale === "ar" ? "AR" : "EN",
        // مرجعنا: معرّف الدفعة (يعود في GetPaymentStatus ونطابقه)
        CustomerReference: input.paymentId,
        UserDefinedField: input.orderId,
        InvoiceItems: [
          { ItemName: `Order ${input.orderNumber}`, Quantity: 1, UnitPrice: filsToDecimal(input.amountFils) },
        ],
      });
      return {
        sessionId: String(res.Data.InvoiceId),
        invoiceId: String(res.Data.InvoiceId),
        redirectUrl: res.Data.InvoiceURL,
      };
    },

    statusByInvoice: (invoiceId) => status(invoiceId, "InvoiceId"),

    async verify(notification: IncomingNotification): Promise<VerifiedPaymentStatus | null> {
      // نقبل من الإشعار رقمًا مرجعيًا فقط، ثم نسأل MyFatoorah عن الحالة الفعلية
      const p = notification.payload as Record<string, unknown>;
      const data = (p.Data ?? p.data ?? {}) as Record<string, unknown>;
      const invoice = (data.Invoice ?? {}) as Record<string, unknown>;
      const transaction = (data.Transaction ?? {}) as Record<string, unknown>;
      const invoiceId = invoice.Id ?? data.InvoiceId ?? p.invoiceId;
      const paymentId = transaction.PaymentId ?? data.PaymentId ?? p.paymentId;
      if (invoiceId) return status(String(invoiceId), "InvoiceId");
      if (paymentId) return status(String(paymentId), "PaymentId");
      return null;
    },
  };
}
