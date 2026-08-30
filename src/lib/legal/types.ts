export type LegalSubsection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: LegalSubsection[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
};
