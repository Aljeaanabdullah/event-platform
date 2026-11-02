"use client";

import jsQR from "jsqr";
import { Ban, Camera, CameraOff, CheckCircle2, CircleAlert, Loader2, RotateCcw, XCircle } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkInTicket, type CheckInResult } from "@/features/checkin/actions";
import { cn } from "@/lib/utils";

const tone: Record<CheckInResult["result"], { cls: string; Icon: typeof CheckCircle2 }> = {
  ok: {
    cls: "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
    Icon: CheckCircle2,
  },
  already_used: {
    cls: "border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-100",
    Icon: CircleAlert,
  },
  wrong_event: {
    cls: "border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-100",
    Icon: CircleAlert,
  },
  void: { cls: "border-red-500/50 bg-red-500/15 text-red-900 dark:text-red-100", Icon: Ban },
  invalid: { cls: "border-red-500/50 bg-red-500/15 text-red-900 dark:text-red-100", Icon: XCircle },
  error: { cls: "border-red-500/50 bg-red-500/15 text-red-900 dark:text-red-100", Icon: XCircle },
};

/**
 * ماسح QR بالكاميرا (jsQR على إطارات الفيديو — يعمل في كل المتصفحات الحديثة) + إدخال يدوي للرمز المطبوع.
 * النتيجة تأتي من الخادم دائمًا؛ الماسح لا يقرر شيئًا بنفسه.
 * بعد كل نتيجة يتوقف المسح لحظيًا لتفادي قراءة نفس الرمز مرات متتالية.
 */
export function Scanner({ eventId }: { eventId: string | null }) {
  const t = useTranslations("CheckIn");
  const locale = useLocale();
  const format = useFormatter();
  const manualId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied" | "unsupported">("off");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manual, setManual] = useState("");
  const [pending, start] = useTransition();

  const submit = useCallback(
    (value: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      start(async () => {
        const res = await checkInTicket({ value, eventId });
        setResult(res);
        if ("vibrate" in navigator) navigator.vibrate(res.result === "ok" ? 80 : [60, 60, 60]);
        setTimeout(() => (busyRef.current = false), 2500);
      });
    },
    [eventId],
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera("off");
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return setCamera("unsupported");
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  }

  // قراءة الإطارات أثناء تشغيل الكاميرا
  useEffect(() => {
    if (camera !== "on") return;
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && !busyRef.current) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
          if (code?.data) submit(code.data);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [camera, submit]);

  useEffect(() => stop, [stop]);

  const view = result ? tone[result.result] : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="grid gap-3">
        <div className="neon-border relative aspect-square overflow-hidden rounded-3xl bg-black">
          <video
            ref={videoRef}
            className={cn("size-full object-cover", camera !== "on" && "hidden")}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden />
          {camera !== "on" ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/80">
              {camera === "starting" ? (
                <Loader2 className="size-8 animate-spin" aria-label={t("starting")} />
              ) : camera === "denied" ? (
                t("cameraDenied")
              ) : camera === "unsupported" ? (
                t("cameraUnsupported")
              ) : (
                t("cameraOff")
              )}
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          )}
        </div>
        {camera === "on" ? (
          <Button type="button" variant="outline" onClick={stop}>
            <CameraOff aria-hidden />
            {t("stopCamera")}
          </Button>
        ) : (
          <Button type="button" onClick={startCamera} className="bg-gradient-neon font-semibold text-white">
            <Camera aria-hidden />
            {t("startCamera")}
          </Button>
        )}
      </div>

      <div className="grid content-start gap-4">
        <form
          className="glass grid gap-2 rounded-2xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) submit(manual);
          }}
        >
          <label htmlFor={manualId} className="text-sm font-medium">
            {t("manualLabel")}
          </label>
          <div className="flex gap-2">
            <Input
              id={manualId}
              dir="ltr"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="T-XXXXXXXXXX"
              autoComplete="off"
              className="h-11 rounded-xl font-mono uppercase"
            />
            <Button type="submit" disabled={pending} className="h-11 rounded-xl">
              {t("check")}
            </Button>
          </div>
        </form>

        <div aria-live="assertive" role="status" data-testid="checkin-result">
          {pending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("checking")}
            </p>
          ) : result && view ? (
            <div className={cn("grid gap-2 rounded-3xl border-2 p-5", view.cls)} data-result={result.result}>
              <p className="flex items-center gap-2 text-xl font-extrabold">
                <view.Icon className="size-7" aria-hidden />
                {t(`result.${result.result}`)}
              </p>
              {result.eventTitleAr ? (
                <p className="font-semibold">{locale === "ar" ? result.eventTitleAr : result.eventTitleEn}</p>
              ) : null}
              {result.code ? (
                <p className="text-sm">
                  {locale === "ar" ? result.ticketTypeAr : result.ticketTypeEn} ·{" "}
                  <span dir="ltr" className="font-mono">
                    {result.code}
                  </span>
                </p>
              ) : null}
              {result.checkedInAt && result.result === "already_used" ? (
                <p className="text-sm">
                  {t("usedAt", { date: format.dateTime(new Date(result.checkedInAt), "eventDateTime") })}
                </p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setResult(null);
                  setManual("");
                }}
              >
                <RotateCcw aria-hidden />
                {t("next")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
