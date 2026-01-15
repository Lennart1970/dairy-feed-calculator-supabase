import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wheat, Zap, Beef, Scale } from "lucide-react";

interface RoughageFeed {
  id: string;
  name: string;
  amount: number;
  dsPercent: number;
  vem: number;
  dve: number;
  oeb: number;
}

interface RoughageSummaryTableProps {
  feeds: RoughageFeed[];
  isGrazing?: boolean;
  onEdit?: () => void;
}

export default function RoughageSummaryTable({ 
  feeds, 
  isGrazing = false,
  onEdit 
}: RoughageSummaryTableProps) {
  // Calculate totals
  const totals = feeds.reduce(
    (acc, feed) => {
      const dryMatter = feed.amount; // Already in kg DS
      return {
        dryMatter: acc.dryMatter + dryMatter,
        vem: acc.vem + (dryMatter * feed.vem),
        dve: acc.dve + (dryMatter * feed.dve),
        oeb: acc.oeb + (dryMatter * feed.oeb),
      };
    },
    { dryMatter: 0, vem: 0, dve: 0, oeb: 0 }
  );

  // Add grazing bonus if applicable
  const grazingVemBonus = isGrazing ? 1175 : 0;
  const totalVem = Math.round(totals.vem + grazingVemBonus);
  const totalDve = Math.round(totals.dve);
  const totalOeb = Math.round(totals.oeb);

  // Filter out feeds with 0 amount
  const activeFeeds = feeds.filter(f => f.amount > 0);

  if (activeFeeds.length === 0) {
    return null;
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wheat className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-sm text-emerald-800 dark:text-emerald-300">
              Ruwvoer Samenvatting
            </span>
            {isGrazing && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                + Beweiding
              </Badge>
            )}
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-emerald-600 hover:text-emerald-700 underline"
            >
              Wijzigen
            </button>
          )}
        </div>

        {/* Compact table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-emerald-200 dark:border-emerald-800">
                <th className="text-left py-1 font-medium text-muted-foreground">Voer</th>
                <th className="text-right py-1 font-medium text-muted-foreground">kg DS</th>
                <th className="text-right py-1 font-medium text-muted-foreground">DS%</th>
                <th className="text-right py-1 font-medium text-muted-foreground">VEM</th>
                <th className="text-right py-1 font-medium text-muted-foreground">DVE</th>
                <th className="text-right py-1 font-medium text-muted-foreground">OEB</th>
              </tr>
            </thead>
            <tbody>
              {activeFeeds.map((feed) => (
                <tr key={feed.id} className="border-b border-emerald-100 dark:border-emerald-900/50">
                  <td className="py-1 text-emerald-900 dark:text-emerald-100">{feed.name}</td>
                  <td className="text-right py-1 font-mono">{feed.amount.toFixed(1)}</td>
                  <td className="text-right py-1 font-mono text-muted-foreground">{feed.dsPercent}%</td>
                  <td className="text-right py-1 font-mono">{Math.round(feed.amount * feed.vem).toLocaleString()}</td>
                  <td className="text-right py-1 font-mono">{Math.round(feed.amount * feed.dve)}g</td>
                  <td className="text-right py-1 font-mono">{Math.round(feed.amount * feed.oeb) >= 0 ? '+' : ''}{Math.round(feed.amount * feed.oeb)}g</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold bg-emerald-100/50 dark:bg-emerald-900/30">
                <td className="py-1.5 text-emerald-800 dark:text-emerald-200">Totaal Ruwvoer</td>
                <td className="text-right py-1.5 font-mono">{totals.dryMatter.toFixed(1)}</td>
                <td className="text-right py-1.5"></td>
                <td className="text-right py-1.5 font-mono text-amber-700 dark:text-amber-400">
                  {totalVem.toLocaleString()}
                </td>
                <td className="text-right py-1.5 font-mono text-blue-700 dark:text-blue-400">
                  {totalDve}g
                </td>
                <td className={`text-right py-1.5 font-mono ${totalOeb >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalOeb >= 0 ? '+' : ''}{totalOeb}g
                </td>
              </tr>
            </tfoot>
          </table>
        </div>


      </CardContent>
    </Card>
  );
}

export type { RoughageFeed };
