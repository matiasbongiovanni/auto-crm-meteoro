"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SectionCard = {
  label: string;
  value: string;
  /** Variación porcentual vs período anterior. null = sin comparación. */
  deltaPct: number | null;
  footerStrong: string;
  footerMuted: string;
  /** Si true, oculta el valor (privacidad de montos). */
  sensitive?: boolean;
};

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) return Minus;
  return pct >= 0 ? TrendingUp : TrendingDown;
}

/**
 * Réplica del patrón "SectionCards" de shadcn dashboard-01 (New York v4):
 * 4 tarjetas con descripción, número grande, badge de tendencia y pie de dos líneas.
 */
export function SectionCards({ cards, blurred }: { cards: SectionCard[]; blurred?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = Trend({ pct: card.deltaPct });
        const hide = blurred && card.sensitive;
        const pctLabel =
          card.deltaPct === null
            ? "—"
            : `${card.deltaPct >= 0 ? "+" : ""}${card.deltaPct.toFixed(1)}%`;
        return (
          <Card key={card.label} className="gap-3">
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle
                className={cn(
                  "text-2xl font-semibold tabular-nums tracking-[-0.02em] @[250px]/card:text-3xl",
                  hide && "blur-sm select-none",
                )}
              >
                {hide ? "••••••" : card.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="gap-1">
                  <Icon className="size-3" />
                  {pctLabel}
                </Badge>
              </CardAction>
            </CardHeader>
            <div className="flex flex-col items-start gap-1 px-4 text-sm">
              <div className="line-clamp-1 flex items-center gap-1.5 font-medium text-foreground/90">
                {card.footerStrong}
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="text-muted-foreground text-[13px]">{card.footerMuted}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
