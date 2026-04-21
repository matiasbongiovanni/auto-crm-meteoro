import type { SyncLeadResponse, WhatsAppUpdate, Contact } from "@/types";

export class WhatsAppSyncClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };
  }

  async fetchLeadsForProspection(
    temperature: string = "cold",
    limit: number = 10,
    offset: number = 0
  ): Promise<SyncLeadResponse[]> {
    const url = new URL(`${this.baseUrl}/api/crm/sync`);
    url.searchParams.set("temperature", temperature);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch leads: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async updateLeadFromWhatsApp(update: WhatsAppUpdate): Promise<Contact> {
    const url = `${this.baseUrl}/api/crm/update-from-whatsapp`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update lead: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async logActivity(
    contactId: string,
    activityType: string,
    description: string
  ): Promise<Contact> {
    return this.updateLeadFromWhatsApp({
      contactId,
      activityType: activityType as any,
      activityDescription: description,
    });
  }

  async updateLeadTemperature(
    contactId: string,
    temperature: "cold" | "warm" | "hot"
  ): Promise<Contact> {
    return this.updateLeadFromWhatsApp({
      contactId,
      temperature,
      activityType: "note",
      activityDescription: `Temperatura actualizada a ${temperature}`,
    });
  }

  async updateLeadScore(contactId: string, score: number): Promise<Contact> {
    return this.updateLeadFromWhatsApp({
      contactId,
      score: Math.max(0, Math.min(100, score)),
      activityType: "note",
      activityDescription: `Score actualizado a ${score}`,
    });
  }
}

// Factory function
export function createWhatsAppSyncClient(
  baseUrl: string,
  apiKey: string
): WhatsAppSyncClient {
  return new WhatsAppSyncClient(baseUrl, apiKey);
}
