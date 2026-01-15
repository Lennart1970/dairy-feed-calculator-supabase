import { FlaskConical, Milk, Wheat, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionNavProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  onPageChange: (page: 4 | 5) => void;
  currentPage: 'calculator' | 4 | 5;
}

export function SectionNav({ activeSection, onSectionClick, onPageChange, currentPage }: SectionNavProps) {
  const sections = [
    { id: "behoefte", label: "1. Behoefte", icon: Milk, color: "blue" },
    { id: "aanbod", label: "2. Aanbod", icon: Wheat, color: "orange" },
  ];

  const pages = [
    { num: 4 as const, label: "4. Expert Rapport", icon: FileSpreadsheet, color: "purple" },
    { num: 5 as const, label: "5. MPR Validatie", icon: FlaskConical, color: "indigo" },
  ];

  const getButtonClasses = (isActive: boolean, color: string) => {
    if (isActive) {
      switch (color) {
        case "emerald": return "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20";
        case "blue": return "bg-blue-500 text-white shadow-lg shadow-blue-500/20";
        case "orange": return "bg-orange-500 text-white shadow-lg shadow-orange-500/20";
        case "purple": return "bg-purple-500 text-white shadow-lg shadow-purple-500/20";
        case "indigo": return "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20";
        default: return "bg-slate-500 text-white";
      }
    }
    return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700";
  };

  return (
    <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
      {/* Section jump links (1, 2, 3) */}
      {sections.map((section, idx) => (
        <div key={section.id} className="flex items-center">
          <button
            onClick={() => onSectionClick(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              getButtonClasses(currentPage === 'calculator' && activeSection === section.id, section.color)
            }`}
          >
            <section.icon className="w-4 h-4" />
            <span className="font-medium">{section.label}</span>
          </button>
          {idx < sections.length - 1 && (
            <div className="w-6 h-0.5 bg-slate-300 dark:bg-slate-700 mx-1" />
          )}
        </div>
      ))}

      {/* Separator */}
      <div className="w-px h-8 bg-slate-300 dark:bg-slate-700 mx-2" />

      {/* Page navigation buttons (4, 5) */}
      {pages.map((page, idx) => (
        <div key={page.num} className="flex items-center">
          <button
            onClick={() => onPageChange(page.num)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              getButtonClasses(currentPage === page.num, page.color)
            }`}
          >
            <page.icon className="w-4 h-4" />
            <span className="font-medium">{page.label}</span>
          </button>
          {idx < pages.length - 1 && (
            <div className="w-6 h-0.5 bg-slate-300 dark:bg-slate-700 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

export default SectionNav;
