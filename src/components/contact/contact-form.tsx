"use client";

import React, { useState } from "react";
import { Mail, User, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";

export interface ContactFormProps {
  locale: string;
}

export function ContactForm({ locale }: ContactFormProps) {
  const isTr = locale === "tr";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mesaj iletilemedi");

      setIsSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isTr ? "İşlem başarısız oldu." : "Failed to send message."));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {isTr ? "Mesajınız Başarıyla İletildi!" : "Message Sent Successfully!"}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-md mx-auto">
          {isTr
            ? "Talebiniz Operis destek ekibine ulaştı. En geç 24 saat içerisinde e-posta adresiniz üzerinden geri dönüş sağlanacaktır."
            : "Your inquiry has been received. Our team will get back to you within 24 hours."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsSuccess(false)}
          className="text-xs mt-2"
        >
          {isTr ? "Yeni Mesaj Gönder" : "Send Another Message"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label={isTr ? "Adınız ve Soyadınız" : "Your Name"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isTr ? "Ad Soyad" : "Full Name"}
          required
          startIcon={<User className="h-4 w-4" aria-hidden="true" />}
        />

        <TextInput
          label={isTr ? "E-posta Adresiniz" : "Email Address"}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adiniz@alanadi.com"
          required
          startIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <TextInput
        label={isTr ? "Konu" : "Subject"}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={isTr ? "Teknik Destek, Kurumsal Ortaklık vb." : "General Inquiry, Partnership, etc."}
        required
      />

      <TextArea
        label={isTr ? "Mesajınız" : "Message"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isTr ? "Mesajınızı ve talebinizi detaylandırın..." : "Write your message here..."}
        required
        rows={5}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full text-sm font-semibold gap-2 cursor-pointer"
        isLoading={isLoading}
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        <span>{isTr ? "Mesajı İlet" : "Send Message"}</span>
      </Button>
    </form>
  );
}
