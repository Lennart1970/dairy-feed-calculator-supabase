import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface StandardRation {
  profileName: string;
  feeds: {
    name: string;
    displayName: string;
    amount: number;
    unit: string;
  }[];
  expectedVem: number;
  targetVem: number;
  expectedDve: number;
  targetDve: number;
  expectedOeb: number;
  notes?: string;
}

// Standaard rantsoenen gebaseerd op de Excel tool analyse
export const standardRations: StandardRation[] = [
  {
    profileName: "Vaars 12 maanden",
    feeds: [
      { name: "kuil_1_gras", displayName: "Kuil 1 gras", amount: 5.3, unit: "kg DS" },
      { name: "kuil_2_gras", displayName: "Kuil 2 gras", amount: 2.7, unit: "kg DS" },
    ],
    expectedVem: 7388,
    targetVem: 6110,
    expectedDve: 573,
    targetDve: 355,
    expectedOeb: 162,
    notes: "Alleen ruwvoer rantsoen geschikt voor groeiende vaarzen. Twee graskuilpartijen voor variatie.",
  },
  {
    profileName: "Melkkoe (30kg melk)",
    feeds: [
      { name: "kuil_1_gras", displayName: "Kuil 1 gras", amount: 5.3, unit: "kg DS" },
      { name: "kuil_2_gras", displayName: "Kuil 2 gras", amount: 2.7, unit: "kg DS" },
      { name: "mais_2025", displayName: "Mais 2025", amount: 8.0, unit: "kg DS" },
      { name: "bierborstel", displayName: "Bierborstel", amount: 0.5, unit: "kg DS" },
      { name: "gerstmeel", displayName: "Gerstmeel", amount: 0.7, unit: "kg DS" },
      { name: "raapzaadschroot", displayName: "Raapzaadschroot", amount: 2.6, unit: "kg DS" },
      { name: "stalbrok", displayName: "Stalbrok", amount: 3.6, unit: "kg product" },
      { name: "startbrok", displayName: "Startbrok", amount: 1.4, unit: "kg product" },
    ],
    expectedVem: 24659,
    targetVem: 18945,
    expectedDve: 2174,
    targetDve: 1742,
    expectedOeb: 177,
    notes: "Volledig rantsoen uit Excel tool. Gebruikt automatenkrachtvoer (Stalbrok + Startbrok).",
  },
  {
    profileName: "Droge koe 9e maand",
    feeds: [
      { name: "kuil_1_gras", displayName: "Kuil 1 gras", amount: 7.0, unit: "kg DS" },
      { name: "kuil_2_gras", displayName: "Kuil 2 gras", amount: 3.5, unit: "kg DS" },
      { name: "mais_2025", displayName: "Mais 2025", amount: 2.0, unit: "kg DS" },
    ],
    expectedVem: 11653,
    targetVem: 9408,
    expectedDve: 865,
    targetDve: 402,
    expectedOeb: 215,
    notes: "Inclusief drachttoeslag (+2.850 VEM). Op afkalfdag: 2kg krachtvoer verstrekken.",
  },
  {
    profileName: "Vaars 1e lactatie (30kg melk)",
    feeds: [
      { name: "kuil_1_gras", displayName: "Kuil 1 gras", amount: 5.0, unit: "kg DS" },
      { name: "kuil_2_gras", displayName: "Kuil 2 gras", amount: 2.5, unit: "kg DS" },
      { name: "mais_2025", displayName: "Mais 2025", amount: 7.0, unit: "kg DS" },
      { name: "raapzaadschroot", displayName: "Raapzaadschroot", amount: 2.0, unit: "kg DS" },
      { name: "stalbrok", displayName: "Stalbrok", amount: 4.0, unit: "kg product" },
      { name: "startbrok", displayName: "Startbrok", amount: 1.5, unit: "kg product" },
    ],
    expectedVem: 21447,
    targetVem: 19575,
    expectedDve: 1876,
    targetDve: 1806,
    expectedOeb: 168,
    notes: "Doel inclusief groeitoeslag (+630 VEM, +64g DVE). Gebalanceerd rantsoen met eiwitsuppletie.",
  },
  {
    profileName: "Hoogproductieve koe (41kg melk)",
    feeds: [
      { name: "kuil_1_gras", displayName: "Kuil 1 gras", amount: 5.3, unit: "kg DS" },
      { name: "kuil_2_gras", displayName: "Kuil 2 gras", amount: 2.7, unit: "kg DS" },
      { name: "mais_2025", displayName: "Mais 2025", amount: 8.0, unit: "kg DS" },
      { name: "bierborstel", displayName: "Bierborstel", amount: 0.5, unit: "kg DS" },
      { name: "gerstmeel", displayName: "Gerstmeel", amount: 0.7, unit: "kg DS" },
      { name: "raapzaadschroot", displayName: "Raapzaadschroot", amount: 2.6, unit: "kg DS" },
      { name: "stalbrok", displayName: "Stalbrok", amount: 3.6, unit: "kg product" },
      { name: "startbrok", displayName: "Startbrok", amount: 1.4, unit: "kg product" },
    ],
    expectedVem: 24659,
    targetVem: 26561,
    expectedDve: 2174,
    targetDve: 2607,
    expectedOeb: 177,
    notes: "Gebaseerd op MPR data: 41 kg/d melk, 4.60% vet, 3.75% eiwit, FCM 44.9 kg. VEM dekking 92.8%, DVE dekking 83.4%.",
  },
];

// Helper function to get standard ration for a profile
export function getStandardRationForProfile(profileName: string): StandardRation | undefined {
  return standardRations.find(r => r.profileName === profileName);
}

interface StandardRationsProps {
  selectedProfileName?: string;
}

export default function StandardRations({ selectedProfileName }: StandardRationsProps) {
  const selectedRation = selectedProfileName 
    ? standardRations.find(r => r.profileName === selectedProfileName)
    : null;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          Standaard Rantsoen Voorbeelden
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Referentie rantsoenen gebaseerd op Rantsoenanalyse tool en CVB 2025 normen
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Table - All Profiles */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold min-w-[180px]">Dierprofiel</TableHead>
                  <TableHead className="text-center font-semibold">Voeders Gebruikt</TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex flex-col items-center">
                      <span>VEM</span>
                      <span className="text-xs font-normal text-muted-foreground">verwacht / doel</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex flex-col items-center">
                      <span>DVE</span>
                      <span className="text-xs font-normal text-muted-foreground">verwacht / doel</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex flex-col items-center">
                      <span>OEB</span>
                      <span className="text-xs font-normal text-muted-foreground">balance</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardRations.map((ration) => {
                  const isSelected = selectedProfileName === ration.profileName;
                  const vemOk = ration.expectedVem >= ration.targetVem;
                  const dveOk = ration.expectedDve >= ration.targetDve;
                  const oebOk = ration.expectedOeb >= 0;
                  
                  return (
                    <TableRow 
                      key={ration.profileName}
                      className={isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/30"}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          )}
                          <span className={isSelected ? "text-primary font-semibold" : ""}>
                            {ration.profileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {ration.feeds.length} componenten
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {vemOk ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span className={vemOk ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                            {ration.expectedVem.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground text-sm">
                            {ration.targetVem.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {dveOk ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span className={dveOk ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                            {ration.expectedDve}g
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground text-sm">
                            {ration.targetDve}g
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {oebOk ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span className={oebOk ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                            {ration.expectedOeb > 0 ? "+" : ""}{ration.expectedOeb}g
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Detailed Feed Breakdown for Selected Profile */}
        {selectedRation && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-primary">
                Voersamenstelling: {selectedRation.profileName}
              </h4>
            </div>
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-medium">Voercomponent</TableHead>
                    <TableHead className="text-right font-medium">Hoeveelheid</TableHead>
                    <TableHead className="text-right font-medium">Eenheid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRation.feeds.map((feed, index) => (
                    <TableRow key={`${feed.name}-${index}`}>
                      <TableCell className="font-medium">{feed.displayName}</TableCell>
                      <TableCell className="text-right">{feed.amount}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{feed.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {selectedRation.notes && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Opmerking:</span> {selectedRation.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
