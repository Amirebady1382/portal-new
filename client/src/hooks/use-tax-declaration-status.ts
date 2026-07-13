import { useQuery, UseQueryResult } from "@tanstack/react-query";

export interface TaxDeclarationStatus {
  hasTaxDeclaration: boolean;
  status: string;
  lastUpdated: string | null;
  error: string | null;
  document: {
    id: number;
    filename: string;
    uploadedAt: string;
    fileSize: number;
  } | null;
}

export function useTaxDeclarationStatus(companyId?: number): UseQueryResult<TaxDeclarationStatus> {
  return useQuery<TaxDeclarationStatus>({
    queryKey: [`/api/companies/${companyId}/tax-declaration-status`],
    enabled: !!companyId,
    refetchInterval: (query: any) => {
      // Support both TanStack Query v5 (query object) and older versions (direct data)
      const data = query?.state?.data !== undefined ? query.state.data : query;
      if (data?.status === 'processing') {
        return 3000;
      }
      return false;
    },
  });
}

