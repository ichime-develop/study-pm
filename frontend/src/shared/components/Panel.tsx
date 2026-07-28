// 通常画面で使う共通の表面コンテナとセクション見出しを提供する。
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type PanelProps = ComponentPropsWithoutRef<"section">;

export const Panel = ({ className, ...props }: PanelProps) => (
  <section {...props} className={className === undefined ? "panel" : `panel ${className}`} />
);

type PanelHeaderProps = {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
  titleAs?: "h1" | "h2" | "h3";
};

export const PanelHeader = ({ actions, description, eyebrow, title, titleAs = "h2" }: PanelHeaderProps) => (
  <div className="panel-header">
    <div>
      {eyebrow !== undefined && <p className="eyebrow">{eyebrow}</p>}
      {titleAs === "h1" && <h1>{title}</h1>}
      {titleAs === "h2" && <h2>{title}</h2>}
      {titleAs === "h3" && <h3>{title}</h3>}
      {description !== undefined && <p className="section-description">{description}</p>}
    </div>
    {actions}
  </div>
);
