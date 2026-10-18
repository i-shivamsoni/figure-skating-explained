"use client";

import { useState, type ReactNode } from "react";
import { TabPanel, Tabs } from "./ui/Tabs";

export interface LessonTab {
  id: string;
  label: string;
  content: ReactNode;
}

/** The long text of a lesson page on tabs under the viewer; a server page passes the content in. */
export function LessonTabs({ tabs, label, scope = "lesson", className }: { tabs: LessonTab[]; label: string; scope?: string; className?: string }) {
  const [tab, setTab] = useState(tabs[0]?.id ?? "");
  return (
    <div className={className}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} label={label} scope={scope} />
      {tabs.map((t) => (
        <TabPanel key={t.id} id={t.id} active={t.id === tab} scope={scope} className="pt-4 text-sm">
          {t.content}
        </TabPanel>
      ))}
    </div>
  );
}
