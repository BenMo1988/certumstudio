import type { Metadata } from "next";
import { Button } from "@/components/studio/Button";
import { Icon } from "@/components/studio/Icon";
import { PageHeader } from "@/components/studio/PageHeader";

export const metadata: Metadata = { title: "Casus invoeren · Certum Studio" };

export default function NewCasePage() {
  return (
    <>
      <PageHeader
        eyebrow="Casus invoeren"
        title="Nieuwe praktijkcasus"
        description="Beschrijf de situatie geanonimiseerd: zonder namen, plaatsen of andere herleidbare gegevens."
      />

      <div className="mt-10 rounded-lg border border-line focus-within:border-petrol-600/50">
        <label htmlFor="case-description" className="sr-only">
          Beschrijving van de casus
        </label>
        <textarea
          id="case-description"
          rows={14}
          placeholder="Beschrijf wat er gebeurde..."
          className="block w-full resize-y rounded-t-lg bg-canvas px-5 py-4 text-[15px] leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-3 py-3 sm:px-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled title="Binnenkort beschikbaar">
              <Icon name="mic" className="size-4" />
              Inspreken
            </Button>
            <Button variant="secondary" disabled title="Binnenkort beschikbaar">
              <Icon name="attachment" className="size-4" />
              Document toevoegen
            </Button>
          </div>
          <Button>Casus analyseren</Button>
        </div>
      </div>
    </>
  );
}
