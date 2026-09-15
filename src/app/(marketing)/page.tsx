import { LiveEngine } from "@ui/patterns/live-engine";
import { WhatsAppPreview } from "@ui/patterns/whatsapp-preview";
import { Card } from "@ui/ui/card";
import { Button } from "@ui/ui/button";
import { DeliveryStateChip } from "@ui/ui/delivery-state-chip";
import { CURRENT_CREATOR_ID } from "@infra/mock/fixtures/courses";
import type { DeliveryState } from "@core/entities/delivery";

const STATES: DeliveryState[] = ["queued", "sent", "delivered", "read", "failed"];

/**
 * Token and component proof sheet. Delete this once real routes exist —
 * it is here so the first `npm run dev` shows you something real.
 */
export default function Page() {
  return (
    <main className="container-page py-16 space-y-16">
      <header>
        <h1 className="text-display">Design foundation</h1>
        <p className="prose-measure mt-4 text-lg text-muted">
          Tokens, primitives and the delivery components. Everything here reads
          from CSS variables, so a creator&rsquo;s branding re-themes the whole
          subtree without touching a component.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-title">Colour</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ["Brand", "bg-brand"],
            ["Deep", "bg-deep"],
            ["Accent", "bg-accent"],
            ["Surface", "bg-surface border border-border"],
            ["Raised", "bg-surface-raised border border-border"],
            ["Sunken", "bg-surface-sunken"],
          ].map(([name, cls]) => (
            <div key={name}>
              <div className={`h-16 rounded-card ${cls}`} />
              <p className="mt-2 text-sm text-muted">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Create your academy</Button>
          <Button variant="secondary">Explore courses</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete course</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title">Delivery states</h2>
        <Card className="flex flex-wrap gap-6 p-5">
          {STATES.map((s) => (
            <DeliveryStateChip key={s} state={s} />
          ))}
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-title">Lesson preview</h2>
        <p className="prose-measure text-muted">
          What the creator sees before scheduling. Same component renders on the
          light surface and on the deep delivery panel.
        </p>
        <WhatsAppPreview
          body={"Good morning, Chiamaka.\n\nDay 7 — Facebook advertising: reaching your exact customer.\n\nReply START QUIZ when you have read through."}
          attachments={[{ kind: "pdf", name: "day-7-reference-guide.pdf" }]}
          timestamp={new Date().toISOString()}
          state="delivered"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-title">Live engine</h2>
        <LiveEngine creatorId={CURRENT_CREATOR_ID} />
      </section>
    </main>
  );
}
