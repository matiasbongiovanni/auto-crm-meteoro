"use client";

import { useState } from "react";
import { ClipboardList, Map, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormularioManual } from "./FormularioManual";
import { ScrapeMaps } from "./ScrapeMaps";
import { ScrapeInstagram } from "./ScrapeInstagram";
import { JobsList } from "./JobsList";

export function GeneradorTabs() {
  const [activeTab, setActiveTab] = useState("formulario");

  function handleJobCreated() {
    setActiveTab("formulario"); // refocus, jobs visible below
  }

  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="formulario" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="maps" className="gap-1.5">
            <Map className="h-3.5 w-3.5" />
            Maps
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            Instagram
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="formulario" className="mt-0">
            <FormularioManual />
          </TabsContent>
          <TabsContent value="maps" className="mt-0">
            <ScrapeMaps onJobCreated={handleJobCreated} />
          </TabsContent>
          <TabsContent value="instagram" className="mt-0">
            <ScrapeInstagram onJobCreated={handleJobCreated} />
          </TabsContent>
        </div>
      </Tabs>

      <div className="border-t border-border pt-6">
        <JobsList />
      </div>
    </div>
  );
}
