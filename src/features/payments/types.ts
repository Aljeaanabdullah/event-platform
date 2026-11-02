/**
 * واجهة مزوّد الدفع (Adapter). كل مزوّد يحقق هذه الواجهة، وبقية النظام لا يعرف تفاصيله.
 * المبالغ دائمًا بالفلس (أعداد صحيحة). لا نستقبل أو نخزّن بيانات البطاقة إطلاقًا:
 * الدفع يتم في صفحة المزوّد المستضافة.
 */
export type ProviderName = "myfatoorah" | "mock";

export type CreateSessionInput = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amountFils: number;
  currency: string;
  locale: "ar" | "en";
  customerName: string;
  customerEmail: string | null;
  /** نعود إليه بعد الدفع — مجرد "منبّه" للتحقق وليس دليلًا على النجاح */
  callbackUrl: string;
  errorUrl: string;
};

export type CreateSessionResult = {
  sessionId: string;
  invoiceId?: string;
  redirectUrl: string;
};

/** الحالة الموثوقة كما يؤكدها المزوّد (من استعلام خادم-لخادم أو Webhook موقّع) */
export type VerifiedPaymentStatus = {
  status: "paid" | "failed" | "cancelled" | "pending";
  /** مرجعنا للدفعة (payments.id) كما أرسلناه للمزوّد */
  paymentId: string;
  /** معرّف المزوّد الذي يربط الدفعة (نفس ما سُجّل في attach_payment_session) */
  sessionId: string;
  amountFils: number;
  currency: string;
  gatewayFeeFils?: number | null;
  failureReason?: string;
  raw: unknown;
};

/** إشعار وارد (Webhook أو عودة المستخدم) بعد التحقق من التوقيع إن وُجد */
export type IncomingNotification = {
  provider: ProviderName;
  /** معرّف فريد للحدث لمنع المعالجة المكررة */
  eventId: string;
  eventType: string;
  signatureValid: boolean;
  payload: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly name: ProviderName;
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  /** يجلب الحالة الموثوقة من المزوّد نفسه */
  verify(notification: IncomingNotification): Promise<VerifiedPaymentStatus | null>;
}
