/**
 * PDF Lab Report Parser
 * Uses LLM to extract feed values from Dutch kuilanalyse reports
 */

import { invokeLLM } from "./_core/llm";

export interface ParsedFeedData {
  productName: string;
  productType: string;
  vem: number;
  dve: number;
  oeb: number;
  dsPercent: number;
  sw: number;
  rawProtein?: number;  // RE (Ruw eiwit)
  rawFiber?: number;    // RC (Ruwe celstof)
  sugar?: number;       // Suiker
  starch?: number;      // Zetmeel
}

export interface ParseResult {
  success: boolean;
  data?: ParsedFeedData;
  error?: string;
  rawResponse?: string;
}

/**
 * Parse a lab report PDF using LLM vision capabilities
 * Uses base64 encoding for Chat Completions API compatibility
 */
export async function parseLabReportPdf(pdfBase64: string): Promise<ParseResult> {
  try {
    const systemPrompt = `Je bent een expert in het analyseren van Nederlandse kuilanalyse rapporten van laboratoria zoals Eurofins Agro en BLGG AgroXpertus.

Je taak is om de voederwaarden te extraheren uit het lab rapport en deze terug te geven in een gestructureerd JSON formaat.

Let specifiek op de volgende waarden:
- Product naam (bijv. "Graskuil", "Snijmaïs")
- Product type (bijv. "1e snede", "2e snede", "Oogst 2024")
- VEM (Voeder Eenheid Melk) - per kg DS
- DVE (Darm Verteerbaar Eiwit) - in grammen per kg DS
- OEB (Onbestendig Eiwit Balans) - in grammen per kg DS (kan negatief zijn)
- DS% (Droge Stof percentage) - in g/kg of als percentage
- SW (Structuurwaarde) - per kg DS
- RE (Ruw eiwit) - optioneel, in g/kg DS
- RC (Ruwe celstof) - optioneel, in g/kg DS
- Suiker - optioneel, in g/kg DS
- Zetmeel - optioneel, in g/kg DS

BELANGRIJK:
- DS% wordt vaak weergegeven als g/kg (bijv. 410 g/kg = 41%)
- VEM is meestal een getal tussen 800-1100
- DVE is meestal een getal tussen 40-100
- OEB kan positief of negatief zijn, meestal tussen -50 en +50
- SW is meestal een getal tussen 1.0 en 4.0`;

    const userPrompt = `Analyseer dit kuilanalyse rapport en extraheer de voederwaarden.

Geef je antwoord ALLEEN als een JSON object in dit exacte formaat:
{
  "productName": "string",
  "productType": "string", 
  "vem": number,
  "dve": number,
  "oeb": number,
  "dsPercent": number,
  "sw": number,
  "rawProtein": number of null,
  "rawFiber": number of null,
  "sugar": number of null,
  "starch": number of null
}

Converteer DS% van g/kg naar percentage als nodig (bijv. 410 g/kg -> 41).
Als een waarde niet gevonden kan worden, gebruik dan een realistische schatting gebaseerd op het type product.`;

    console.log("[pdfParser] Calling LLM with base64 PDF data");
    
    // Ensure base64 data doesn't have data URL prefix
    let cleanBase64 = pdfBase64;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    
    // Create data URL for the PDF
    const pdfDataUrl = `data:application/pdf;base64,${cleanBase64}`;
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: userPrompt },
            { 
              type: "image_url", 
              image_url: { 
                url: pdfDataUrl,
                detail: "high"
              } 
            }
          ]
        }
      ]
    });
    
    console.log("[pdfParser] LLM response received:", JSON.stringify(response).substring(0, 500));

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return {
        success: false,
        error: "Geen geldige response van LLM ontvangen"
      };
    }

    try {
      // Strip markdown code blocks if present (```json...```)
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```')) {
        // Remove opening code block (```json or ```)
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing code block
        jsonContent = jsonContent.replace(/\n?```\s*$/, '');
      }
      
      const data = JSON.parse(jsonContent) as ParsedFeedData;
      
      // Validate the parsed data
      if (!data.productName || typeof data.vem !== "number" || typeof data.dve !== "number") {
        return {
          success: false,
          error: "Onvolledige data geëxtraheerd uit het rapport",
          rawResponse: content
        };
      }

      // Normalize DS% if it was given in g/kg
      if (data.dsPercent > 100) {
        data.dsPercent = data.dsPercent / 10;
      }

      return {
        success: true,
        data,
        rawResponse: content
      };
    } catch (parseError) {
      return {
        success: false,
        error: "Kon de LLM response niet als JSON parsen",
        rawResponse: content
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Onbekende fout bij het parsen van het rapport"
    };
  }
}

// Legacy function for URL-based parsing (kept for backward compatibility)
export async function uploadPdfForProcessing(
  pdfBuffer: Buffer,
  fileName: string
): Promise<string> {
  // Convert buffer to base64
  return pdfBuffer.toString('base64');
}
