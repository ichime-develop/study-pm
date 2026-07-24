// 認証画面の2カラム構成を提供する。
import type { ReactNode } from "react";

type AuthLayoutProps = {
  screenId: "AU01" | "AU02";
  title: string;
  description: string;
  children: ReactNode;
};

export const AuthLayout = ({ screenId, title, description, children }: AuthLayoutProps) => (
  <main className="auth-page">
    <section className="auth-hero">
      <p className="eyebrow">{screenId}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
    <section className="auth-card">{children}</section>
  </main>
);
