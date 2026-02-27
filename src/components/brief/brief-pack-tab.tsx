"use client";

import { Accordion } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BriefSectionComponent } from "./brief-section";
import type { BriefPack } from "@/types";

interface BriefPackTabProps {
  briefPack: BriefPack | null;
  onToggleReviewed: (sectionId: string) => void;
  onRegenerateSection: (sectionId: string) => void;
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
}

export function BriefPackTab({
  briefPack,
  onToggleReviewed,
  onRegenerateSection,
  activeCitationId,
  onCitationClick,
}: BriefPackTabProps) {
  if (!briefPack) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Select a flight to view the brief pack.
      </div>
    );
  }

  const allSectionIds = briefPack.sections.map((s) => s.id);

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Accordion type="multiple" defaultValue={allSectionIds}>
          {briefPack.sections.map((section) => (
            <BriefSectionComponent
              key={section.id}
              section={section}
              onToggleReviewed={onToggleReviewed}
              onRegenerate={onRegenerateSection}
              activeCitationId={activeCitationId}
              onCitationClick={onCitationClick}
            />
          ))}
        </Accordion>
      </div>
    </ScrollArea>
  );
}
