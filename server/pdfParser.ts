import { getLLM } from "./_core/llm";
import { fromPath } from "pdf2pic";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Parse a lab report PDF using OpenAI Vision API
 * Converts PDF to images first, then analyzes with GPT-4 Vision
 */
export async function parseLabReportPdf(pdfBase64: string) {
  const llm = getLLM();
  let tempPdfPath: string | null = null;
  const tempImagePaths: string[] = [];
  
  try {
    // Strip data URL prefix if present
    let base64Data = pdfBase64;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Create temp directory
    const tempDir = join(tmpdir(), `pdf-parse-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    // Save PDF to temp file
    tempPdfPath = join(tempDir, 'input.pdf');
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    writeFileSync(tempPdfPath, pdfBuffer);
    
    // Convert PDF to images using pdf2pic
    const converter = fromPath(tempPdfPath, {
      density: 200,
      saveFilename: "page",
      savePath: tempDir,
      format: "png",
      width: 2000,
      height: 2800
    });
    
    // Convert all pages (assuming max 5 pages for lab reports)
    const imagePromises = [];
    for (let i = 1; i <= 5; i++) {
      imagePromises.push(
        converter(i, { responseType: "base64" })
          .catch(() => null) // Ignore errors for pages that don't exist
      );
    }
    
    const results = await Promise.all(imagePromises);
    const imageBase64s = results
      .filter(r => r !== null && r.base64)
      .map(r => r!.base64!);
    
    if (imageBase64s.length === 0) {
      throw new Error("Kon geen pagina's uit PDF extraheren");
    }
    
    // Prepare image content for OpenAI
    const imageContents = imageBase64s.map(base64 => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/png;base64,${base64}`,
        detail: "high" as const
      }
    }));
    
    // Call OpenAI Vision API
    const response = await llm.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Je bent een expert in het analyseren van Nederlandse laboratoriumrapporten voor ruwvoer (gras en maïs kuilvoer).

Analyseer dit laboratoriumrapport en extraheer de volgende informatie:

1. **Voersoort**: Graslandkuil, Maïskuil, of andere
2. **Voedingswaarden** (per kg DS):
   - DS% (Droge Stof percentage)
   - VEM (Voedereenheid Melk)
   - DVE (Darm Verteerbaar Eiwit, in g/kg)
   - OEB (Onbestendige Eiwit Balans, in g/kg)
   - SW (Structuurwaarde)
   - Ruw Eiwit (RE, in g/kg)
   - Ruwe Celstof (RC, in g/kg)
   - Zetmeel (in g/kg, vooral voor maïs)

3. **Monster informatie**:
   - Monsternummer
   - Datum van analyse
   - Perceelnummer of locatie (indien vermeld)

Geef het resultaat in JSON formaat:
{
  "feedType": "Graslandkuil" of "Maïskuil",
  "sampleNumber": "...",
  "analysisDate": "YYYY-MM-DD",
  "location": "...",
  "values": {
    "dsPercent": 45.2,
    "vem": 920,
    "dve": 85,
    "oeb": 45,
    "sw": 1.2,
    "re": 145,
    "rc": 220,
    "starch": 0
  }
}

Als een waarde niet gevonden kan worden, gebruik dan null.`
            },
            ...imageContents
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Geen response van AI model");
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Kon geen JSON vinden in AI response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: parsed
    };
    
  } catch (error) {
    console.error("PDF parsing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Onbekende fout bij PDF verwerking"
    };
  } finally {
    // Cleanup temp files
    if (tempPdfPath) {
      try {
        unlinkSync(tempPdfPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    for (const imagePath of tempImagePaths) {
      try {
        unlinkSync(imagePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}
