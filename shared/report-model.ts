export interface FinancialRatios {
  cashRatio: number;
  quickRatio: number;
  roe: number;
  debtRatio: number;
  assetTurnover: number;
  netProfitMargin: number;
  currentRatio: number;
  proprietaryRatio: number;
  debtToEquityRatio: number;
  salesGrowth: number;
}

export interface CreditScoringCoefficients {
  behavioral: number;
  operational: number;
  market: number;
  profitability: number;
  repaymentCapacity: number;
  collateralCheck: number;
  collateralProperty: number;
  legalGuarantor: number;
  nonDefaultProbability: number;
}

export interface CreditLimits {
  checkAndNote: number;
  propertyCollateral: number;
  legalGuarantor: number;
}

export interface CompanyCreditReport {
  companyInfo: {
    name: string;
    nationalId: string;
    type: string;
    legalStatus: string;
    registrationPlace: string;
    establishedDate: string;
    knowledgeBasedDate?: string;
    currentCapital: number;
  };
  requestInfo: {
    productName: string;
    requestType: string;
    requestedAmount: number;
    planTitle: string;
  };
  personnelInfo: {
    currentCount: number;
    employmentCreation: number;
  };
  financialRatios: FinancialRatios;
  scoringCoefficients: CreditScoringCoefficients;
  creditLimits: CreditLimits;
  previousServices: {
    proposedAmount: number;
    totalReceived: number;
    arrears: number;
    bankFacilities: number;
    currentGuarantees: number;
    currentFacilities: number;
  };
  article141Compliance: boolean;
  expertOpinion?: string;
}
