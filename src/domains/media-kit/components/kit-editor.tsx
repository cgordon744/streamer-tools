"use client";

import {
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  Globe,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_ACCENT_COLOR } from "@/core/config/media-kit";
import type { YoutubeChannel } from "@/core/youtube/schema";
import {
  connectChannelAction,
  publishKitAction,
  refreshChannelStatsAction,
  saveKitAction,
  unpublishKitAction,
} from "@/domains/media-kit/actions";
import {
  KitView,
  type KitViewData,
} from "@/domains/media-kit/components/kit-view";
import type { Kit, RateCardLine } from "@/domains/media-kit/schema";
import type { ActionResult } from "@/lib/action-result";

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function KitEditor({
  kit,
  channel,
  verifiedSponsors,
  creatorName,
}: {
  kit: Kit | null;
  channel: YoutubeChannel | null;
  verifiedSponsors: { name: string; completedDealCount: number }[];
  creatorName: string;
}) {
  // Editable content is client state; publish/slug state stays on the `kit`
  // prop (server truth, refreshed by revalidatePath after actions).
  const [niche, setNiche] = useState(kit?.niche ?? "");
  const [pitch, setPitch] = useState(kit?.pitch ?? "");
  const [audienceAge, setAudienceAge] = useState(kit?.audienceAge ?? "");
  const [audienceGender, setAudienceGender] = useState(
    kit?.audienceGender ?? "",
  );
  const [audienceGeo, setAudienceGeo] = useState(kit?.audienceGeo ?? "");
  const [contactEmail, setContactEmail] = useState(kit?.contactEmail ?? "");
  const [accentColor, setAccentColor] = useState(
    kit?.accentColor ?? DEFAULT_ACCENT_COLOR,
  );
  const [rateCard, setRateCard] = useState<RateCardLine[]>(kit?.rateCard ?? []);
  const [brandHighlights, setBrandHighlights] = useState<string[]>(
    kit?.brandHighlights ?? [],
  );
  const [showVerifiedSponsors, setShowVerifiedSponsors] = useState(
    kit?.showVerifiedSponsors ?? true,
  );
  const [newHighlight, setNewHighlight] = useState("");
  const [channelRef, setChannelRef] = useState("");
  const [isPending, startTransition] = useTransition();

  const payload = {
    template: kit?.template ?? "classic",
    niche,
    pitch,
    audienceAge,
    audienceGender,
    audienceGeo,
    contactEmail,
    accentColor,
    rateCard,
    brandHighlights,
    showVerifiedSponsors,
  };

  const preview: KitViewData = {
    creatorName,
    niche: niche || null,
    pitch: pitch || null,
    audienceAge: audienceAge || null,
    audienceGender: audienceGender || null,
    audienceGeo: audienceGeo || null,
    contactEmail: contactEmail || null,
    accentColor,
    rateCard,
    brandHighlights,
    showVerifiedSponsors,
    channel,
    verifiedSponsors,
  };

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (result.message) toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  const save = () => run(() => saveKitAction(payload));
  const publish = () =>
    run(async () => {
      // Publish always captures the latest edits first.
      const saved = await saveKitAction(payload);
      if (!saved.ok) return saved;
      return publishKitAction();
    });

  function copyLink(slug: string) {
    navigator.clipboard
      .writeText(`${window.location.origin}/kit/${slug}`)
      .then(() => toast.success("Link copied"));
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clapperboard className="size-4" /> Your channel
            </CardTitle>
            <CardDescription>
              Public stats fill your kit automatically — and stay current.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channel ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{channel.title}</div>
                  <div className="text-muted-foreground">
                    {channel.handle ? `@${channel.handle} · ` : null}
                    {compact.format(channel.subscriberCount)} subscribers
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(refreshChannelStatsAction)}
                >
                  <RefreshCw className="size-3.5" /> Refresh stats
                </Button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input
                value={channelRef}
                onChange={(e) => setChannelRef(e.target.value)}
                placeholder="youtube.com/@yourchannel or @handle"
              />
              <Button
                variant={channel ? "outline" : "default"}
                disabled={isPending || !channelRef.trim()}
                onClick={() =>
                  run(async () => {
                    const result = await connectChannelAction(channelRef);
                    if (result.ok) setChannelRef("");
                    return result;
                  })
                }
              >
                {channel ? "Switch" : "Connect"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Niche" id="niche">
                <Input
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Tech reviews"
                />
              </Field>
              <Field label="Contact email" id="contactEmail">
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
            </div>
            <Field label="Pitch" id="pitch">
              <Textarea
                id="pitch"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="One short paragraph on what you make and who watches it."
                rows={3}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Audience age" id="audienceAge">
                <Input
                  id="audienceAge"
                  value={audienceAge}
                  onChange={(e) => setAudienceAge(e.target.value)}
                  placeholder="18–34 (72%)"
                />
              </Field>
              <Field label="Gender split" id="audienceGender">
                <Input
                  id="audienceGender"
                  value={audienceGender}
                  onChange={(e) => setAudienceGender(e.target.value)}
                  placeholder="68% male"
                />
              </Field>
              <Field label="Top locations" id="audienceGeo">
                <Input
                  id="audienceGeo"
                  value={audienceGeo}
                  onChange={(e) => setAudienceGeo(e.target.value)}
                  placeholder="US, UK, Canada"
                />
              </Field>
            </div>
            <p className="text-muted-foreground text-xs">
              Audience numbers are in YouTube Studio under Analytics → Audience.
              Connecting YouTube for automatic demographics is coming soon.
            </p>
            <Field label="Accent color" id="accentColor">
              <input
                id="accentColor"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-16 cursor-pointer rounded-md border p-1"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rates</CardTitle>
            <CardDescription>
              Free text — ranges and bundles are fine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rateCard.map((line, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={line.label}
                  onChange={(e) =>
                    setRateCard(
                      replaceAt(rateCard, i, {
                        ...line,
                        label: e.target.value,
                      }),
                    )
                  }
                  placeholder="Dedicated video"
                  aria-label={`Rate ${i + 1} label`}
                />
                <Input
                  value={line.price}
                  onChange={(e) =>
                    setRateCard(
                      replaceAt(rateCard, i, {
                        ...line,
                        price: e.target.value,
                      }),
                    )
                  }
                  placeholder="$2,500"
                  className="max-w-36"
                  aria-label={`Rate ${i + 1} price`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove rate ${i + 1}`}
                  onClick={() =>
                    setRateCard(rateCard.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={rateCard.length >= 12}
              onClick={() =>
                setRateCard([...rateCard, { label: "", price: "" }])
              }
            >
              <Plus className="size-3.5" /> Add rate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Highlights</CardTitle>
            <CardDescription>
              Past campaigns, press, records — one line each.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {brandHighlights.map((highlight, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{highlight}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove highlight ${i + 1}`}
                  onClick={() =>
                    setBrandHighlights(
                      brandHighlights.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHighlight();
                  }
                }}
                placeholder="Sponsored series with Acme hit 1M views"
              />
              <Button
                variant="outline"
                disabled={!newHighlight.trim() || brandHighlights.length >= 12}
                onClick={addHighlight}
              >
                Add
              </Button>
            </div>
            {verifiedSponsors.length > 0 ? (
              <label className="flex items-center gap-2 pt-1 text-sm">
                <input
                  type="checkbox"
                  checked={showVerifiedSponsors}
                  onChange={(e) => setShowVerifiedSponsors(e.target.checked)}
                  className="accent-primary size-4"
                />
                Show verified brands from your tracked deals (
                {verifiedSponsors.length})
              </label>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={isPending}>
                Save
              </Button>
              {kit?.publishedAt ? (
                <Button
                  variant="outline"
                  onClick={() => run(unpublishKitAction)}
                  disabled={isPending}
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={publish}
                  disabled={isPending}
                >
                  <Globe className="size-4" /> Save &amp; publish
                </Button>
              )}
            </div>
            {kit?.publishedAt && kit.slug ? (
              <div className="space-y-3">
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <Check className="size-4 text-emerald-600" />
                  Live at
                  <Link
                    href={`/kit/${kit.slug}`}
                    target="_blank"
                    className="text-foreground font-medium underline underline-offset-4"
                  >
                    /kit/{kit.slug}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(kit.slug!)}
                  >
                    <Copy className="size-3.5" /> Copy link
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Edits go live as soon as you save — the link never changes.
                </p>
                <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <span>
                    When a brand replies to this kit, where does that deal go?
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/">
                      Track it <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="xl:sticky xl:top-6">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Preview
        </p>
        <KitView data={preview} />
      </div>
    </div>
  );

  function addHighlight() {
    const value = newHighlight.trim();
    if (!value || brandHighlights.length >= 12) return;
    setBrandHighlights([...brandHighlights, value]);
    setNewHighlight("");
  }
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item));
}
