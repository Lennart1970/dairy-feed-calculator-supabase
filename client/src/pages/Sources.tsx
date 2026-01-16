import { useState } from 'react';
import { Link } from 'wouter';
import { 
  BookOpen, 
  FileText, 
  FlaskConical, 
  Building2, 
  Wheat,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  GraduationCap,
  Scale
} from 'lucide-react';

interface Source {
  title: string;
  author?: string;
  year?: string | number;
  type?: string;
  description?: string;
}

interface SourceCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  sources: Source[];
}

const sourceCategories: SourceCategory[] = [
  {
    id: 'standards',
    title: 'Officiële Standaarden & Voedertabellen',
    icon: <Scale className="w-6 h-6" />,
    description: 'CVB en NASEM normen die de basis vormen voor alle berekeningen',
    color: 'from-blue-500 to-blue-600',
    sources: [
      {
        title: 'CVB Tabellenboek Voeding Herkauwers 2022',
        author: 'Stichting CVB / WUR',
        year: 2022,
        description: 'CVB-serie nr. 66 - Basis voor VEM, DVE en OEB berekeningen'
      },
      {
        title: 'Tabellenboek Voeding Herkauwers 2025',
        author: 'Stichting CVB',
        year: 2025,
        description: 'Meest recente voedertabellen met geactualiseerde waarden'
      },
      {
        title: 'Booklet of Feeding Tables for Pigs',
        author: 'Stichting CVB / WUR',
        year: 2023,
        description: 'CVB-serie nr. 68 - Referentie voor vergelijkende analyses'
      },
      {
        title: 'Nutrient Requirements of Dairy Cattle: Eighth Revised Edition',
        author: 'NASEM (National Academies)',
        year: 2021,
        description: 'Internationale standaard voor energie- en eiwitbehoeften'
      },
      {
        title: 'NASEM Nutrient Requirements: Dry Cows, Calves, and Heifers',
        author: 'Jim Drackley / Balchem',
        year: 2021,
        description: 'Specifieke normen voor droogstaande koeien en jongvee'
      },
      {
        title: 'A review of the new NASEM 2021 Nutrient Requirements',
        author: 'Selko',
        year: 2021,
        description: 'Praktische interpretatie van NASEM 2021 normen'
      }
    ]
  },
  {
    id: 'research',
    title: 'Wetenschappelijke Rapporten & Publicaties',
    icon: <FlaskConical className="w-6 h-6" />,
    description: 'Peer-reviewed onderzoek van WUR en internationale journals',
    color: 'from-emerald-500 to-emerald-600',
    sources: [
      {
        title: 'Update of the Dutch protein evaluation system: The DVE/OEB2010 system',
        author: 'Van Duinkerken et al. (J. Agric. Sci.)',
        year: 2011,
        description: 'Fundamentele update van het Nederlandse eiwitwaarderingssysteem'
      },
      {
        title: 'Eiwitwaardering voor herkauwers: het DVE/OEB 2007 systeem',
        author: 'Tamminga et al. (CVB Report 52)',
        year: 2007,
        description: 'Uitgebreide documentatie van het DVE/OEB systeem'
      },
      {
        title: 'The Dutch protein evaluation system: the DVE/OEB system',
        author: 'Tamminga et al. (Livestock Prod. Sci.)',
        year: 1994,
        description: 'Originele wetenschappelijke publicatie van het DVE/OEB systeem'
      },
      {
        title: 'Energiebehoefte van droogstaande en lacterende guste Holstein Friesian koeien',
        author: 'Spek & Sebek (WUR Report 1211)',
        year: 2019,
        description: 'Specifiek onderzoek naar energiebehoeften van HF koeien'
      },
      {
        title: 'Comparison of CVB (2022) DRUP and IP values with INRA and NASEM',
        author: 'Spek & Van Laar (WUR Report 1514)',
        year: 2024,
        description: 'Vergelijking van internationale voederwaarderingssystemen'
      },
      {
        title: 'Evaluation of CVB Table values for predicting digestibility in youngstock',
        author: 'Spek et al. (WUR Report 1444)',
        year: 2025,
        description: 'Validatie van CVB waarden voor jongvee'
      },
      {
        title: 'Capacities of animals to make agri-food systems more circular',
        author: 'Mens et al. (WUR Report 1323)',
        year: 2021,
        description: 'Onderzoek naar circulaire veehouderij'
      },
      {
        title: 'Jersey-kaas: klimaatvriendelijk?',
        author: 'De Wit & Van Eekeren (Louis Bolk Instituut)',
        year: 2023,
        description: 'Vergelijkend onderzoek Jersey vs Holstein voor duurzaamheid'
      },
      {
        title: 'Optimization of feed use efficiency in ruminant production systems',
        author: 'Makkar & Beever (FAO Proceedings)',
        year: 2013,
        description: 'FAO richtlijnen voor voederefficiëntie'
      },
      {
        title: 'De voederconversie van melkvee',
        author: 'Van Duinkerken (Rundveeloket Report 20)',
        year: 2007,
        description: 'Praktische handleiding voederconversie'
      },
      {
        title: 'Plasma and Milk Variables Classify Diet Using Machine Learning',
        author: 'Wang et al. (MDPI Metabolites)',
        year: 2025,
        description: 'Moderne ML-technieken voor voedingsanalyse'
      },
      {
        title: 'Feed Efficiency and Physiological Parameters of Holstein and Crossbred',
        author: 'Knob et al. (MDPI Animals)',
        year: 2023,
        description: 'Vergelijkend onderzoek voederefficiëntie'
      },
      {
        title: 'Production responses of dairy cows to precision feeding',
        author: 'Souza et al. (J. Anim. Sci.)',
        year: 2025,
        description: 'Precisie-voeding in de praktijk'
      }
    ]
  },
  {
    id: 'technical',
    title: 'Technische Documentatie',
    icon: <FileText className="w-6 h-6" />,
    description: 'Interne documentatie en specificaties van de calculator',
    color: 'from-purple-500 to-purple-600',
    sources: [
      {
        title: 'Calculation Engine Technical Blueprint for CVB Ruminant Nutrition',
        type: 'Technisch Document',
        description: 'Gedetailleerde beschrijving van alle rekenformules'
      },
      {
        title: 'Dairy Feed Calculator - Professional Upgrade Plan',
        type: 'Projectplan',
        description: 'Roadmap voor professionele functionaliteit'
      },
      {
        title: 'Dairy Feed Calculator - Functional Description',
        type: 'Functionele Specificatie',
        description: 'Beschrijving van alle functionaliteiten'
      },
      {
        title: 'Calculation Engine Documentation',
        type: 'Technisch Document',
        description: 'Implementatiedetails van de rekenmotor'
      },
      {
        title: 'Framework and Variables for the Dutch Dairy Feed Calculator',
        type: 'Projectdocument',
        description: 'Overzicht van alle variabelen en hun definities'
      },
      {
        title: 'Ruminant Feed Saturation and Intake Capacity Parameters',
        type: 'Projectdocument',
        description: 'VOC en verzadigingswaarde parameters'
      },
      {
        title: 'Technical Evaluation of the Dutch Feed Evaluation System',
        type: 'Review Document',
        description: 'Kritische evaluatie van het CVB systeem'
      }
    ]
  },
  {
    id: 'breeds',
    title: 'Rasvergelijkingen & Extensie-artikelen',
    icon: <GraduationCap className="w-6 h-6" />,
    description: 'Vergelijkend onderzoek tussen melkveerassen',
    color: 'from-amber-500 to-amber-600',
    sources: [
      {
        title: 'A comparative study on milk composition of Jersey and Holstein',
        author: 'PMC / NIH',
        description: 'Wetenschappelijke vergelijking melksamenstelling'
      },
      {
        title: 'Comparative Feed Efficiency of Holstein and Jersey Cows',
        author: 'Blake et al. (J. Dairy Sci.)',
        description: 'Voederefficiëntie vergelijking'
      },
      {
        title: 'Crossbreds of Jersey x Holstein compared with pure Holsteins',
        author: 'Heins et al. (PubMed)',
        description: 'Kruisingsonderzoek Jersey × Holstein'
      },
      {
        title: 'Consistency of dry matter intake in Holstein cows',
        author: 'Cavani et al. (PubMed)',
        description: 'Onderzoek naar DS-opname consistentie'
      },
      {
        title: 'Jersey vs. Holstein: Which Dairy Breed Delivers Greater Profitability?',
        author: 'The Bullvine',
        description: 'Economische vergelijking'
      },
      {
        title: 'Nutrition of Jersey Cows - Little Holstein Cows or a Breed Apart?',
        author: 'Ohio State University',
        description: 'Specifieke voedingsbehoeften Jersey'
      },
      {
        title: 'Are Holstein or Jersey cows more profitable?',
        author: 'MSU Extension',
        description: 'Praktische rendabiliteitsanalyse'
      },
      {
        title: 'Comparing Holstein vs. Jersey Cows for Organic Production',
        author: 'Danish Crown Dairy',
        description: 'Biologische productie vergelijking'
      }
    ]
  },
  {
    id: 'feed',
    title: 'Voeranalyse, Kwaliteit & Industriedata',
    icon: <Wheat className="w-6 h-6" />,
    description: 'Praktische bronnen voor voerwaarden en kwaliteit',
    color: 'from-orange-500 to-orange-600',
    sources: [
      {
        title: 'Quality Manual and Analysis for Soybean Products in the Feed Industry',
        author: 'USSEC (3rd Edition)',
        description: 'Kwaliteitshandboek sojaproducten'
      },
      {
        title: 'Nutritive Values of Feeds ANSI 3018',
        author: 'Oklahoma State University',
        description: 'Amerikaanse voederwaarden database'
      },
      {
        title: 'Optimaliseren van de eiwitkwaliteit van grasland',
        author: 'Rundveeloket (ILVO)',
        description: 'Praktische tips voor graslandmanagement'
      },
      {
        title: 'Wat leert melkureum ons over het voeder?',
        author: 'Rundveeloket',
        description: 'Interpretatie van melkureumwaarden'
      },
      {
        title: 'Ureumgehalte weerspiegelt bedrijfsvoering',
        author: 'WUR eDepot',
        description: 'Relatie ureum en bedrijfsmanagement'
      },
      {
        title: 'Voederwaardeprijzen Rundvee',
        author: 'WUR',
        description: 'Actuele voederwaardeprijzen'
      },
      {
        title: 'Voederwaarde Snijmaïs',
        author: 'Farmers4all.nl',
        description: 'Praktische informatie snijmaïs'
      }
    ]
  }
];

function SourceCard({ source, index }: { source: Source; index: number }) {
  return (
    <div 
      className="bg-white rounded-lg p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 text-sm font-medium">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm leading-snug">
            {source.title}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {source.author && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {source.author}
              </span>
            )}
            {source.year && (
              <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                {source.year}
              </span>
            )}
            {source.type && (
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {source.type}
              </span>
            )}
          </div>
          {source.description && (
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              {source.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: SourceCategory }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-5 flex items-center gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white shadow-lg`}>
          {category.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-gray-900 text-lg">
            {category.title}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {category.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
            {category.sources.length} bronnen
          </span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="grid gap-3 md:grid-cols-2">
            {category.sources.map((source, index) => (
              <SourceCard key={index} source={source} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sources() {
  const totalSources = sourceCategories.reduce((acc, cat) => acc + cat.sources.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Terug naar Calculator</span>
            </a>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bronnen & Referenties
              </h1>
              <p className="text-gray-500 mt-1">
                Wetenschappelijke onderbouwing van de Dairy Feed Calculator
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">{totalSources}</div>
              <div className="text-green-100 text-sm">Totaal Bronnen</div>
            </div>
            <div className="w-px h-10 bg-green-400/30 hidden sm:block" />
            <div>
              <div className="text-3xl font-bold">{sourceCategories.length}</div>
              <div className="text-green-100 text-sm">Categorieën</div>
            </div>
            <div className="w-px h-10 bg-green-400/30 hidden sm:block" />
            <div>
              <div className="text-3xl font-bold">CVB 2025</div>
              <div className="text-green-100 text-sm">Primaire Standaard</div>
            </div>
            <div className="w-px h-10 bg-green-400/30 hidden sm:block" />
            <div>
              <div className="text-3xl font-bold">WUR</div>
              <div className="text-green-100 text-sm">Onderzoekspartner</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg mb-2">
                Over deze bronnenlijst
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                De Dairy Feed Calculator is gebaseerd op de officiële Nederlandse voedernormen (CVB) en 
                internationale standaarden (NASEM). Alle berekeningen zijn wetenschappelijk onderbouwd 
                met peer-reviewed onderzoek van Wageningen University & Research en andere gerenommeerde 
                instituten. Deze pagina geeft een volledig overzicht van alle gebruikte bronnen, 
                georganiseerd per categorie.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  CVB Gecertificeerd
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Peer-Reviewed
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Actueel (2025)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {sourceCategories.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-600">
            <ExternalLink className="w-4 h-4" />
            <span>Alle bronnen zijn beschikbaar voor verificatie op verzoek</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Dairy Feed Calculator • Gebaseerd op CVB 2025 Voedernormen
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Ontwikkeld met wetenschappelijke nauwkeurigheid voor de Nederlandse melkveehouderij
          </p>
        </div>
      </footer>
    </div>
  );
}
