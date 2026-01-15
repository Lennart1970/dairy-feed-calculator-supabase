import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";

export interface ParsedFeedData {
  productName: string;
  productType: string;
  vem: number;
  dve: number;
  oeb: number;
  dsPercent: number;
  sw: number;
  rawProtein?: number | null;
  rawFiber?: number | null;
  sugar?: number | null;
  starch?: number | null;
}

interface LabReportUploadProps {
  onParsed: (data: ParsedFeedData) => void;
  onClose?: () => void;
}

export function LabReportUpload({ onParsed, onClose }: LabReportUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseStatus, setParseStatus] = useState<"idle" | "uploading" | "parsing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedFeedData | null>(null);

  const parseMutation = trpc.labReport.parse.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        setParseStatus("success");
        setParsedData(result.data);
      } else {
        setParseStatus("error");
        setErrorMessage(result.error || "Kon het rapport niet parsen");
      }
    },
    onError: (error) => {
      setParseStatus("error");
      setErrorMessage(error.message || "Er is een fout opgetreden");
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setParseStatus("idle");
        setErrorMessage("");
      } else {
        setErrorMessage("Alleen PDF bestanden zijn toegestaan");
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setParseStatus("idle");
        setErrorMessage("");
      } else {
        setErrorMessage("Alleen PDF bestanden zijn toegestaan");
      }
    }
  }, []);

  const handleUploadAndParse = async () => {
    if (!selectedFile) return;

    setParseStatus("uploading");
    setErrorMessage("");

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        
        setParseStatus("parsing");
        
        parseMutation.mutate({
          pdfBase64: base64,
          fileName: selectedFile.name,
        });
      };
      reader.onerror = () => {
        setParseStatus("error");
        setErrorMessage("Kon het bestand niet lezen");
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      setParseStatus("error");
      setErrorMessage("Er is een fout opgetreden bij het uploaden");
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      onParsed(parsedData);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseStatus("idle");
    setErrorMessage("");
    setParsedData(null);
  };

  return (
    <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Lab Rapport Uploaden</h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {parseStatus === "idle" && !selectedFile && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? "border-green-500 bg-green-100" 
                : "border-gray-300 hover:border-green-400 hover:bg-green-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              Sleep uw kuilanalyse rapport hierheen
            </p>
            <p className="text-sm text-gray-500 mb-4">of</p>
            <label>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline" asChild>
                <span className="cursor-pointer">Selecteer PDF bestand</span>
              </Button>
            </label>
            <p className="text-xs text-gray-400 mt-4">
              Ondersteunde formaten: Eurofins Agro, BLGG AgroXpertus
            </p>
          </div>
        )}

        {selectedFile && parseStatus === "idle" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <FileText className="w-8 h-8 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUploadAndParse} className="flex-1 bg-green-600 hover:bg-green-700">
                <Upload className="w-4 h-4 mr-2" />
                Analyseren met AI
              </Button>
            </div>
          </div>
        )}

        {(parseStatus === "uploading" || parseStatus === "parsing") && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-green-600 animate-spin" />
            <p className="text-gray-600">
              {parseStatus === "uploading" ? "Bestand uploaden..." : "Rapport analyseren met AI..."}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Dit kan enkele seconden duren
            </p>
          </div>
        )}

        {parseStatus === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Fout bij verwerken</p>
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Opnieuw proberen
            </Button>
          </div>
        )}

        {parseStatus === "success" && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="font-medium text-green-800">Rapport succesvol geanalyseerd!</p>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3 text-gray-800">Geëxtraheerde waarden:</h4>
              
              {/* Product info */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-gray-500">Product:</span>
                  <span className="ml-2 font-medium">{parsedData.productName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium">{parsedData.productType}</span>
                </div>
              </div>
              
              {/* Nutritional values - all from lab report */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-amber-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">DS%</div>
                  <div className="font-bold text-amber-700">{parsedData.dsPercent}%</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">VEM</div>
                  <div className="font-bold text-green-700">{parsedData.vem}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">DVE</div>
                  <div className="font-bold text-blue-700">{parsedData.dve}g</div>
                </div>
                <div className={`rounded-lg p-2 text-center ${parsedData.oeb >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                  <div className="text-xs text-gray-500 mb-1">OEB</div>
                  <div className={`font-bold ${parsedData.oeb >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {parsedData.oeb > 0 ? "+" : ""}{parsedData.oeb}g
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">SW</div>
                  <div className="font-bold text-purple-700">{parsedData.sw.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Ander rapport
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Waarden overnemen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
