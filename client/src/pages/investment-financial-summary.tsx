import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, RefreshCw, Loader2 } from "lucide-react";
import { toPersianNumber } from "@/lib/persian-utils";
import jspdf from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

export default function InvestmentFinancialSummary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const syncInProgress = useRef<string>("");

  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
  });

  const { data: companyDetails, refetch: refetchDetails, isFetching: isFetchingDetails } = useQuery({
    queryKey: [`/api/companies/${selectedCompanyId}`],
    enabled: !!selectedCompanyId && selectedCompanyId !== "",
  });

  const { data: autoFinancialData, refetch: refetchFin, isFetching: isFetchingFin } = useQuery({
    queryKey: [`/api/companies/${selectedCompanyId}/financial-summary`],
    enabled: !!selectedCompanyId && selectedCompanyId !== "",
  }) as any;

  const { data: serviceRequestsResponse, refetch: refetchReq, isFetching: isFetchingReq } = useQuery({
    queryKey: [`/api/service-requests`, { companyId: selectedCompanyId }],
    enabled: !!selectedCompanyId && selectedCompanyId !== "",
  }) as any;

  const isUpdating = isFetchingDetails || isFetchingFin || isFetchingReq;
  const serviceRequests = serviceRequestsResponse?.items || [];

  // Comprehensive Financial State
  const [finData, setFinData] = useState<any>({
    sales: { 1402: 0, 1403: 0, 1404: 0 },
    netProfit: { 1402: 0, 1403: 0, 1404: 0 },
    retainedEarnings: { 1402: 0, 1403: 0, 1404: 0 },
    cash: { 1402: 0, 1403: 0, 1404: 0 },
    inventory: { 1402: 0, 1403: 0, 1404: 0 },
    operatingCashFlow: { 1402: 0, 1403: 0, 1404: 0 },
    insuranceList: { 1402: 0, 1403: 0, 1404: 0 },
    currentLiabilities: { 1402: 0, 1403: 0, 1404: 0 },
    currentAssets: { 1402: 0, 1403: 0, 1404: 0 },
    reserves: { 1402: 0, 1403: 0, 1404: 0 },
    stInvestment: { 1402: 0, 1403: 0, 1404: 0 },
    totalLiabilities: { 1402: 0, 1403: 0, 1404: 0 },
    totalAssets: { 1402: 0, 1403: 0, 1404: 0 },
    interestExpense: { 1402: 0, 1403: 0, 1404: 0 },
    capital: { 1402: 0, 1403: 0, 1404: 0 },
  });

  // Metadata & Other Fields
  const [metadata, setMetadata] = useState({
    reportDate: new Date().toLocaleDateString('fa-IR'),
    docSubmissionDate: "",
    reportType: "دانش بنیان",
    productName: "",
    requestType: "",
    requestedAmount: 0,
    personnelInsurance: 0,
    jobCreation: 0,
    knowledgeBasedType: "",
    legalEntity: "",
    registrationLocation: "",
    establishmentDate: "",
    knowledgeBasedDate: "",
    currentCapital: 0,
    proposedAmount: 0,
    companyArrears: 0,
    ceoArrears: 0,
    boardArrears: 0,
    totalCollateralValue: 0,
    totalServicesFund: 0,
    bankFacilities: 0,
    guaranteesCurrent: 0,
    facilitiesCurrent: 0,
  });

  const [coefficients, setCoefficients] = useState({
    behavioral: 1,
    operational: 1,
    envMarket: 1,
    profitability: 0.5,
    repayment: 0.2,
    collateralCheck: 0.4,
    collateralRealEstate: 1,
    legalGuarantor: 0.9,
    defaultProbability: 1,
  });

  const syncFromSources = () => {
    if (!companyDetails) return;

    console.log("🏢 Syncing with verified Rasmio mapping...");
    
    // Parse rasmioData - handle string or object, and look for basicInfo sub-object
    let rawRasmio = companyDetails.rasmioData;
    if (typeof rawRasmio === 'string') {
      try { rawRasmio = JSON.parse(rawRasmio); } catch { rawRasmio = {}; }
    }
    
    // Rasmio data in this app is often nested under basicInfo
    const rasmio = rawRasmio?.basicInfo || rawRasmio || {};
    
    // VERIFIED MAPPING FROM OTHER PAGES:
    // 1. Capital (سرمایه)
    const capitalVal = parseFloat(String(companyDetails.registeredCapital || rasmio.capital || rasmio.RegistrationCapital || "0").replace(/,/g, '')) || 0;
    
    // 2. Dates
    const kbDate = companyDetails.knowledgeBasedDate || rasmio.persianRegistrationDate || rasmio.knowledgeBasedDate || "";
    const estabDate = companyDetails.establishmentDate || rasmio.persianRegistrationDate || rasmio.registrationDate || "";
    
    // 3. Entity Info
    const legEnt = companyDetails.legalEntity || rasmio.registrationType?.wordUsedToShow || rasmio.registrationType?.title || "";
    const loc = companyDetails.registrationLocation || (rasmio.address ? rasmio.address.split(' ')[0] : "") || rasmio.province || "";
    const prods = companyDetails.productName || (rasmio.products?.[0]?.title || "");
    const personnel = companyDetails.employeeCount || rasmio.employeeCount || 0;

    setFinData((prev: any) => ({
      ...prev,
      capital: { 1402: capitalVal, 1403: capitalVal, 1404: capitalVal }
    }));

    setMetadata(prev => ({
      ...prev,
      productName: prods || prev.productName,
      registrationLocation: loc || prev.registrationLocation,
      knowledgeBasedType: companyDetails.knowledgeBasedType || rasmio.status || prev.knowledgeBasedType,
      knowledgeBasedDate: kbDate || prev.knowledgeBasedDate,
      establishmentDate: estabDate || prev.establishmentDate,
      legalEntity: legEnt || prev.legalEntity,
      currentCapital: capitalVal || prev.currentCapital,
      personnelInsurance: personnel || prev.personnelInsurance,
    }));

    if (serviceRequests && serviceRequests.length > 0) {
      const latest = serviceRequests[0];
      const data = latest.requestData || {};
      setMetadata(prev => ({
        ...prev,
        requestType: latest.serviceTitle || prev.requestType,
        requestedAmount: parseFloat(String(data.amount || data.requestedAmount || 0)) || prev.requestedAmount,
      }));
    }

    if (autoFinancialData?.success && autoFinancialData?.data) {
      const d = autoFinancialData.data;
      const ym: any = {};
      if (d.metadata?.fiscalYears?.[1]) ym[d.metadata.fiscalYears[1]] = 'year2';
      if (d.metadata?.fiscalYears?.[0]) ym[d.metadata.fiscalYears[0]] = 'year1';

      setFinData((prev: any) => {
        const newData = { ...prev };
        [1402, 1403, 1404].forEach(y => {
          const sk = ym[y.toString()];
          if (sk) {
            newData.sales[y] = d.directItems.revenue?.[sk] || prev.sales[y];
            newData.netProfit[y] = d.directItems.netProfit?.[sk] || prev.netProfit[y];
          }
        });
        return newData;
      });
    }
  };

  // Trigger sync when data arrives, but only once per company change to avoid loops
  useEffect(() => {
    if (selectedCompanyId && companyDetails && syncInProgress.current !== selectedCompanyId) {
      syncInProgress.current = selectedCompanyId;
      syncFromSources();
    }
  }, [selectedCompanyId, companyDetails, serviceRequestsResponse, autoFinancialData]);

  // Manual reset when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      syncInProgress.current = ""; // Allow re-sync
      // Initial clear
      setMetadata(prev => ({
        ...prev,
        productName: "", requestType: "", requestedAmount: 0, personnelInsurance: 0, jobCreation: 0,
        knowledgeBasedType: "", legalEntity: "", registrationLocation: "", establishmentDate: "",
        knowledgeBasedDate: "", currentCapital: 0,
      }));
    }
  }, [selectedCompanyId]);

  const handleSyncClick = async () => {
    syncInProgress.current = ""; // Force re-sync
    await Promise.all([refetchDetails(), refetchFin(), refetchReq()]);
    toast({ title: "اطلاعات با موفقیت به‌روزرسانی شد" });
  };

  const handleInputChange = (section: string, field: string, year: number | null, value: string) => {
    let englishValue = String(value)
      .replace(/[۰-۹]/g, d => '0123456789'[d.charCodeAt(0) - 1776])
      .replace(/[٠-٩]/g, d => '0123456789'[d.charCodeAt(0) - 1632])
      .replace(/\//g, '.');

    const cleanValue = englishValue.replace(/,/g, '');
    
    if (section === 'financial' && year !== null) {
      if (cleanValue === '' || cleanValue === '-') {
        setFinData((prev: any) => ({ ...prev, [field]: { ...prev[field], [year]: cleanValue } }));
        return;
      }
      const numValue = parseFloat(cleanValue);
      setFinData((prev: any) => ({ ...prev, [field]: { ...prev[field], [year]: isNaN(numValue) ? 0 : numValue } }));
    } else if (section === 'metadata') {
      const isNumericField = ['requestedAmount', 'personnelInsurance', 'jobCreation', 'currentCapital', 'proposedAmount', 'companyArrears', 'ceoArrears', 'boardArrears', 'totalCollateralValue', 'totalServicesFund', 'bankFacilities', 'guaranteesCurrent', 'facilitiesCurrent'].includes(field);
      if (isNumericField) {
        if (cleanValue === '') {
          setMetadata(prev => ({ ...prev, [field]: '' }));
          return;
        }
        const numValue = parseFloat(cleanValue);
        setMetadata(prev => ({ ...prev, [field]: isNaN(numValue) ? 0 : numValue }));
      } else {
        setMetadata(prev => ({ ...prev, [field]: value }));
      }
    } else if (section === 'coefficients') {
      setCoefficients(prev => ({ ...prev, [field]: cleanValue }));
    }
  };

  const calculated = useMemo(() => {
    const years = [1402, 1403, 1404];
    const results: any = {};
    const getFloat = (v: any) => parseFloat(String(v)) || 0;

    years.forEach(year => {
      const d = {
        sales: getFloat(finData.sales[year]),
        netProfit: getFloat(finData.netProfit[year]),
        retainedEarnings: getFloat(finData.retainedEarnings[year]),
        reserves: getFloat(finData.reserves[year]),
        currentAssets: getFloat(finData.currentAssets[year]),
        currentLiabilities: getFloat(finData.currentLiabilities[year]),
        inventory: getFloat(finData.inventory[year]),
        cash: getFloat(finData.cash[year]),
        stInvestment: getFloat(finData.stInvestment[year]),
        totalLiabilities: getFloat(finData.totalLiabilities[year]),
        totalAssets: getFloat(finData.totalAssets[year]),
        capital: getFloat(finData.capital[year]),
      };

      const equity = d.capital + d.retainedEarnings + d.reserves;
      const isMoshmool = (d.capital + d.retainedEarnings) < (0.5 * d.capital);
      
      results[year] = {
        equity, isMoshmool,
        cashRatio: d.currentLiabilities ? ((d.cash + d.stInvestment) / d.currentLiabilities).toFixed(2) : "0",
        quickRatio: d.currentLiabilities ? ((d.currentAssets - d.inventory) / d.currentLiabilities).toFixed(2) : "0",
        currentRatio: d.currentLiabilities ? (d.currentAssets / d.currentLiabilities).toFixed(3) : "0",
        roe: equity ? (d.netProfit / equity).toFixed(2) : "0",
        profitMargin: d.sales ? (d.netProfit / d.sales).toFixed(2) : "0",
        debtRatio: d.totalAssets ? (d.totalLiabilities / d.totalAssets).toFixed(2) : "0",
        equityRatio: d.totalAssets ? (equity / d.totalAssets).toFixed(2) : "0",
        debtToEquity: equity ? (d.totalLiabilities / equity).toFixed(2) : "0",
        assetTurnover: d.totalAssets ? (d.sales / d.totalAssets).toFixed(2) : "0",
      };
    });
    return results;
  }, [finData]);

  const calculatedLimits = useMemo(() => {
    const getFloat = (v: any) => parseFloat(String(v)) || 0;
    const baseSales = getFloat(finData.sales[1403]) || getFloat(finData.sales[1404]) || getFloat(finData.sales[1402]) || 0;
    
    const behavioral = getFloat(coefficients.behavioral);
    const operational = getFloat(coefficients.operational);
    const envMarket = getFloat(coefficients.envMarket);
    const profitability = getFloat(coefficients.profitability);
    const repayment = getFloat(coefficients.repayment);
    
    const coreBase = behavioral * operational * envMarket * profitability * repayment * 10;
    
    return {
      limitCheck: Math.round(coreBase * getFloat(coefficients.collateralCheck) * baseSales),
      limitRealEstate: Math.round(coreBase * getFloat(coefficients.collateralRealEstate) * baseSales),
      limitGuarantor: Math.round(coreBase * getFloat(coefficients.legalGuarantor) * baseSales),
      defaultProbability: (coreBase * getFloat(coefficients.collateralRealEstate)).toFixed(2)
    };
  }, [finData.sales, coefficients]);

  const handlePrint = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = reportRef.current;
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const styleTag = clonedDoc.createElement('style');
          styleTag.innerHTML = `
            * { 
              font-family: 'Tahoma', 'Arial', sans-serif !important;
              box-sizing: border-box !important;
              -webkit-font-smoothing: antialiased;
            }
            .grid {
              display: block !important;
              width: 100% !important;
              direction: rtl !important;
              clear: both !important;
              overflow: hidden !important;
            }
            .grid > div {
              display: block !important;
              float: right !important;
              min-height: 22px !important;
              border: 0.5px solid #e5e7eb !important;
              padding: 2px 1px !important;
              text-align: center !important;
            }
            h3.bg-[#E2EFDA] {
              display: block !important;
              width: 100% !important;
              clear: both !important;
              text-align: center !important;
              margin-bottom: 0 !important;
            }
          `;
          clonedDoc.head.appendChild(styleTag);

          const clonedBody = clonedDoc.body;
          clonedBody.style.direction = 'rtl';
          clonedBody.style.width = '1100px';
          
          const report = clonedDoc.querySelector('.max-w-5xl') as HTMLElement;
          if (report) {
            report.style.width = '1000px';
            report.style.maxWidth = 'none';
            report.style.margin = '0';
            report.style.boxShadow = 'none';
          }

          clonedDoc.querySelectorAll('.grid').forEach(el => {
            const grid = el as HTMLElement;
            let totalCols = 1;
            const gridClasses = Array.from(grid.classList);
            const colsClass = gridClasses.find(c => c.startsWith('grid-cols-'));
            if (colsClass) {
              totalCols = parseInt(colsClass.replace('grid-cols-', '')) || 1;
            }

            Array.from(grid.children).forEach(child => {
              const item = child as HTMLElement;
              let span = 1;
              const itemClasses = Array.from(item.classList);
              const spanClass = itemClasses.find(c => c.startsWith('col-span-'));
              if (spanClass) {
                span = parseInt(spanClass.replace('col-span-', '')) || 1;
              }
              item.style.width = (span / totalCols * 100) + '%';
            });
          });

          clonedDoc.querySelectorAll('div, h1, h2, h3, h4, p, span, td, th').forEach(el => {
            const element = el as HTMLElement;
            if (element.innerText.trim().length > 0) {
              element.style.direction = 'rtl';
              element.style.unicodeBidi = 'embed';
              
              if (element.classList.contains('bg-[#F2F2F2]') || element.classList.contains('bg-[#E2EFDA]') || element.classList.contains('font-bold')) {
                element.style.fontWeight = '600';
                element.style.whiteSpace = 'nowrap';
              } else {
                element.style.fontWeight = '400';
              }
              
              if (element.classList.contains('text-center')) {
                element.style.textAlign = 'center';
              }
            }
          });

          clonedDoc.querySelectorAll('input, textarea').forEach(el => {
            const input = el as HTMLInputElement | HTMLTextAreaElement;
            const span = clonedDoc.createElement('span');
            span.textContent = input.value || (input as any).placeholder || '';
            const style = window.getComputedStyle(input);
            span.style.display = 'block';
            span.style.width = '100%';
            span.style.textAlign = 'center';
            span.style.fontSize = style.fontSize;
            span.style.fontWeight = '600';
            span.style.color = '#000000';
            if (input.parentNode) input.parentNode.replaceChild(span, input);
          });
        }
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jspdf("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`Credit_Report_${companyDetails?.name || "Report"}.pdf`);
      toast({ title: "PDF آماده شد" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "خطا در تولید PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <Header />
      <MobileSidebar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 md:mr-72 p-4 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">خلاصه گزارش وضعیت اعتباری</h1>
            <div className="flex gap-2">
              <Button 
                onClick={handleSyncClick} 
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
                disabled={!selectedCompanyId || isUpdating}
              >
                {isUpdating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}
                به‌روزرسانی داده‌ها
              </Button>
              <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white" disabled={isGeneratingPdf || !selectedCompanyId}>
                {isGeneratingPdf ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}
                چاپ گزارش رسمی
              </Button>
            </div>
          </div>

          <Card className="p-6 mb-6 shadow-sm border-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>انتخاب شرکت</Label>
                <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId}>
                  <SelectTrigger><SelectValue placeholder="انتخاب شرکت..." /></SelectTrigger>
                  <SelectContent>{companies?.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تاریخ گزارش</Label>
                <Input type="text" value={metadata.reportDate} onChange={(e) => handleInputChange('metadata', 'reportDate', null, e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>نوع گزارش</Label>
                <Input type="text" value={metadata.reportType} onChange={(e) => handleInputChange('metadata', 'reportType', null, e.target.value)} />
              </div>
            </div>
          </Card>

          <div ref={reportRef} className="bg-white p-6 border shadow-lg rounded-none max-w-5xl mx-auto print:shadow-none font-sans text-[10px]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <img src="/Logo-Gfund_1750240015251.png" alt="Logo" className="h-12" />
              <div className="text-center">
                <h2 className="text-lg font-bold">خلاصه گزارش وضعیت اعتباری</h2>
                <p className="text-[10px] text-gray-500">صندوق پژوهش و فناوری استان گیلان</p>
              </div>
              <div className="text-left">
                <p>تاریخ: {toPersianNumber(metadata.reportDate)}</p>
                <p>کد: FIN-{selectedCompanyId || "---"}</p>
              </div>
            </div>

            {/* مشخصات کلی */}
            <div className="mb-4">
              <h3 className="bg-[#E2EFDA] text-center font-bold border py-1">مشخصات کلی شرکت</h3>
              <div className="grid grid-cols-8 border-x border-b">
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">نام شرکت</div>
                <div className="p-1 border-l border-b text-center col-span-1 font-bold">{companyDetails?.name || "---"}</div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">شناسه ملی</div>
                <div className="p-1 border-l border-b text-center col-span-1 font-bold">{toPersianNumber(companyDetails?.nationalId || "---")}</div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">نوع شرکت</div>
                <div className="p-1 border-l border-b text-center col-span-1"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={metadata.knowledgeBasedType} onChange={(e) => handleInputChange('metadata', 'knowledgeBasedType', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">نوع شخصیت حقوقی</div>
                <div className="p-1 border-b text-center col-span-1"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={metadata.legalEntity} onChange={(e) => handleInputChange('metadata', 'legalEntity', null, e.target.value)} /></div>

                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">محل ثبت</div>
                <div className="p-1 border-l border-b text-center col-span-1"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={metadata.registrationLocation} onChange={(e) => handleInputChange('metadata', 'registrationLocation', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">تاریخ تاسیس</div>
                <div className="p-1 border-l border-b text-center col-span-1"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={metadata.establishmentDate} onChange={(e) => handleInputChange('metadata', 'establishmentDate', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">تاریخ دانش‌بنیانی</div>
                <div className="p-1 border-l border-b text-center col-span-1"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={metadata.knowledgeBasedDate} onChange={(e) => handleInputChange('metadata', 'knowledgeBasedDate', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-center col-span-1">سرمایه فعلی (میلیون ریال)</div>
                <div className="p-1 border-b text-center col-span-1 font-bold">{toPersianNumber(metadata.currentCapital === '' ? '' : Number(metadata.currentCapital).toLocaleString())}</div>
              </div>
              <div className="grid grid-cols-8 border-x border-b">
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center col-span-1">نام محصولات /خدمات</div>
                <div className="p-1 border-l text-center col-span-7"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={metadata.productName} onChange={(e) => handleInputChange('metadata', 'productName', null, e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-8 border-x border-b">
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center col-span-1">نوع درخواست</div>
                <div className="p-1 border-l text-center col-span-3"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={metadata.requestType} onChange={(e) => handleInputChange('metadata', 'requestType', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center col-span-1">مبلغ درخواستی (میلیون ریال)</div>
                <div className="p-1 text-center col-span-3 font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.requestedAmount === '' ? '' : Number(metadata.requestedAmount).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'requestedAmount', null, e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-8 border-x border-b">
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center col-span-2">عدم شمول ماده 141 قانون تجارت</div>
                <div className="p-1 border-l text-center col-span-2 font-bold">
                   {calculated[1403]?.isMoshmool ? <span className="text-red-600">مشمول (هشدار)</span> : <span className="text-green-600">عدم شمول</span>}
                </div>
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center col-span-2">تعداد پرسنل در آخرین لیست بیمه (نفر)</div>
                <div className="p-1 border-l text-center col-span-1"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.personnelInsurance === '' ? '' : Number(metadata.personnelInsurance).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'personnelInsurance', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center col-span-1">ایجاد اشتغال (نفر)</div>
                <div className="p-1 text-center col-span-1"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.jobCreation === '' ? '' : Number(metadata.jobCreation).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'jobCreation', null, e.target.value)} /></div>
              </div>
            </div>

            {/* نسبت‌های مالی */}
            <div className="mb-4">
              <h3 className="bg-[#E2EFDA] text-center font-bold border py-1">نسبت های مالی شرکت</h3>
              <div className="grid grid-cols-6 border">
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">نسبت وجه نقد</div>
                <div className="p-1 border-l border-b text-center font-bold">{toPersianNumber(calculated[1403]?.cashRatio)}</div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">نسبت آنی</div>
                <div className="p-1 border-l border-b text-center font-bold">{toPersianNumber(calculated[1403]?.quickRatio)}</div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">بازده حقوق صاحبان سهام (ROE)</div>
                <div className="p-1 border-b text-center font-bold">{toPersianNumber(calculated[1403]?.roe)}</div>

                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">نسبت بدهی ها</div>
                <div className="p-1 border-l border-b text-center font-bold">{toPersianNumber(calculated[1403]?.debtRatio)}</div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">گردش دارایی</div>
                <div className="p-1 border-l border-b text-center font-bold">{toPersianNumber(calculated[1403]?.assetTurnover)}</div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">حاشیه سود خالص</div>
                <div className="p-1 border-b text-center font-bold">{toPersianNumber(calculated[1403]?.profitMargin)}</div>

                <div className="bg-[#F2F2F2] p-1 border-l font-bold">نسبت جاری</div>
                <div className="p-1 border-l text-center font-bold">{toPersianNumber(calculated[1403]?.currentRatio)}</div>
                <div className="bg-[#F2F2F2] p-1 border-l font-bold">نسبت مالکانه</div>
                <div className="p-1 border-l text-center font-bold">{toPersianNumber(calculated[1403]?.equityRatio)}</div>
                <div className="bg-[#F2F2F2] p-1 border-l font-bold">نسبت بدهی به حقوق صاحبان سهام</div>
                <div className="p-1 text-center font-bold">{toPersianNumber(calculated[1403]?.debtToEquity)}</div>
              </div>
            </div>

            {/* ضرایب اعتبارسنجی */}
            <div className="mb-4">
              <h3 className="bg-[#E2EFDA] text-center font-bold border py-1">ضرایب کمی و کیفی اعتبارسنجی</h3>
              <div className="grid grid-cols-6 border">
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">اعتبارسنجی رفتاری</div>
                <div className="p-1 border-l border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.behavioral)} onChange={(e) => handleInputChange('coefficients', 'behavioral', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">اعتبارسنجی عملیاتی</div>
                <div className="p-1 border-l border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.operational)} onChange={(e) => handleInputChange('coefficients', 'operational', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold text-xs">ضریب سودآوری و عملکرد</div>
                <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.profitability)} onChange={(e) => handleInputChange('coefficients', 'profitability', null, e.target.value)} /></div>

                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">ضریب توان بازپرداخت</div>
                <div className="p-1 border-l border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.repayment)} onChange={(e) => handleInputChange('coefficients', 'repayment', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">ضریب وثیقه چک و سفته</div>
                <div className="p-1 border-l border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.collateralCheck)} onChange={(e) => handleInputChange('coefficients', 'collateralCheck', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">اعتبارسنجی محیطی و بازار</div>
                <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.envMarket)} onChange={(e) => handleInputChange('coefficients', 'envMarket', null, e.target.value)} /></div>

                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">ضریب احتمال عدم نکول</div>
                <div className="p-1 border-l border-b text-center font-bold">{toPersianNumber(calculatedLimits.defaultProbability)}</div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">ضریب وثیقه ملکی</div>
                <div className="p-1 border-l border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.collateralRealEstate)} onChange={(e) => handleInputChange('coefficients', 'collateralRealEstate', null, e.target.value)} /></div>
                <div className="bg-[#F2F2F2] p-1 border-l border-b font-bold">ضریب ضامن حقوقی</div>
                <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(coefficients.legalGuarantor)} onChange={(e) => handleInputChange('coefficients', 'legalGuarantor', null, e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-6 border-x border-b">
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center">حد اعتباری با چک و سفته</div>
                <div className="p-1 border-l text-center font-bold">{toPersianNumber(calculatedLimits.limitCheck.toLocaleString())}</div>
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center">حد اعتباری با وثیقه ملکی</div>
                <div className="p-1 border-l text-center font-bold">{toPersianNumber(calculatedLimits.limitRealEstate.toLocaleString())}</div>
                <div className="bg-[#F2F2F2] p-1 border-l font-bold text-center">حد اعتباری با ضامن حقوقی</div>
                <div className="p-1 text-center font-bold">{toPersianNumber(calculatedLimits.limitGuarantor.toLocaleString())}</div>
              </div>
            </div>

            {/* خدمات دریافتی */}
            <div className="mb-4">
              <h3 className="bg-[#E2EFDA] text-center font-bold border py-1">اطلاعات خدمات دریافتی</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 border font-bold">
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">مبلغ تسهیلات پیشنهادی</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.proposedAmount === '' ? '' : Number(metadata.proposedAmount).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'proposedAmount', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">میزان معوقات و چک برگشتی شرکت</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.companyArrears === '' ? '' : Number(metadata.companyArrears).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'companyArrears', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">میزان معوقات و چک برگشتی مدیرعامل شرکت</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.ceoArrears === '' ? '' : Number(metadata.ceoArrears).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'ceoArrears', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">میزان معوقات و چک برگشتی اعضای هیات مدیره شرکت</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.boardArrears === '' ? '' : Number(metadata.boardArrears).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'boardArrears', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l">مجموع ارزش وثیقه ملکی و خودروی</div>
                   <div className="p-1 text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.totalCollateralValue === '' ? '' : Number(metadata.totalCollateralValue).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'totalCollateralValue', null, e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 border font-bold">
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">مجموع خدمات دریافتی از طریق صندوق از ابتدا تاکنون</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.totalServicesFund === '' ? '' : Number(metadata.totalServicesFund).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'totalServicesFund', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">مبلغ تسهیلات دریافتی از بانک ها</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.bankFacilities === '' ? '' : Number(metadata.bankFacilities).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'bankFacilities', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">مجموع ضمانتنامه دریافتی از صندوق (جاری)</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.guaranteesCurrent === '' ? '' : Number(metadata.guaranteesCurrent).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'guaranteesCurrent', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l border-b">مجموع تسهیلات دریافتی از صندوق (جاری)</div>
                   <div className="p-1 border-b text-center font-bold"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={toPersianNumber(metadata.facilitiesCurrent === '' ? '' : Number(metadata.facilitiesCurrent).toLocaleString())} onChange={(e) => handleInputChange('metadata', 'facilitiesCurrent', null, e.target.value)} /></div>
                   <div className="bg-[#F2F2F2] p-1 border-l">مجموع خدمات دریافتی از طریق صندوق (جاری)</div>
                   <div className="p-1 text-center font-bold">---</div>
                </div>
              </div>
            </div>

            {/* اطلاعات مالی */}
            <div className="mb-4">
              <h3 className="bg-[#E2EFDA] text-center font-bold border py-1">اطلاعات مالی شرکت (میلیون ریال)</h3>
              <div className="flex gap-4">
                <table className="w-1/2 border-collapse border">
                  <thead><tr className="bg-[#F2F2F2]"><th className="border p-1">شرح/سال</th><th className="border p-1">1404</th><th className="border p-1">1403</th><th className="border p-1">1402</th></tr></thead>
                  <tbody>
                    {[
                      { label: "فروش", key: "sales" },
                      { label: "سود(زیان) خالص", key: "netProfit" },
                      { label: "سود(زیان) انباشته", key: "retainedEarnings" },
                      { label: "موجودی نقد", key: "cash" },
                      { label: "موجودی مواد و کالا", key: "inventory" },
                      { label: "جریان خالص ورود نقد حاصل از عملیات", key: "operatingCashFlow" },
                      { label: "لیست بیمه شرکت (نفر)", key: "insuranceList" },
                    ].map(row => (
                      <tr key={row.key}>
                        <td className="border p-1 bg-[#F2F2F2] font-bold">{row.label}</td>
                        {[1404, 1403, 1402].map(year => (
                          <td key={year} className="border p-0 text-center"><Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={finData[row.key][year] === '' || finData[row.key][year] === '-' ? toPersianNumber(finData[row.key][year]) : toPersianNumber(Number(finData[row.key][year]).toLocaleString())} onChange={(e) => handleInputChange('financial', row.key, year, e.target.value)} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table className="w-1/2 border-collapse border">
                  <thead><tr className="bg-[#F2F2F2]"><th className="border p-1">شرح/سال</th><th className="border p-1">1404</th><th className="border p-1">1403</th><th className="border p-1">1402</th></tr></thead>
                  <tbody>
                    {[
                      { label: "بدهی جاری", key: "currentLiabilities" },
                      { label: "دارایی جاری", key: "currentAssets" },
                      { label: "حقوق صاحبان سهام", key: "equity" },
                      { label: "سرمایه گذاری کوتاه مدت", key: "stInvestment" },
                      { label: "جمع بدهی ها", key: "totalLiabilities" },
                      { label: "جمع دارایی ها", key: "totalAssets" },
                      { label: "هزینه بهره", key: "interestExpense" },
                    ].map(row => (
                      <tr key={row.key}>
                        <td className="border p-1 bg-[#F2F2F2] font-bold">{row.label}</td>
                        {[1404, 1403, 1402].map(year => (
                          <td key={year} className="border p-0 text-center">
                            {row.key === 'equity' ? toPersianNumber(calculated[year]?.equity.toLocaleString()) : 
                            <Input variant="ghost" className="h-4 text-center p-0 text-[10px]" value={finData[row.key][year] === '' || finData[row.key][year] === '-' ? toPersianNumber(finData[row.key][year]) : toPersianNumber(Number(finData[row.key][year]).toLocaleString())} onChange={(e) => handleInputChange('financial', row.key, year, e.target.value)} />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 grid grid-cols-3 gap-8 text-center font-bold opacity-80 border-t pt-4">
              <div><p className="mb-8">واحد ارزیابی و نظارت</p><div className="h-px w-24 border-b border-dotted border-gray-400 mx-auto"></div></div>
              <div><p className="mb-8">کارشناس پرونده</p><div className="h-px w-24 border-b border-dotted border-gray-400 mx-auto"></div></div>
              <div><p className="mb-8">مدیریت سرمایه‌گذاری</p><div className="h-px w-24 border-b border-dotted border-gray-400 mx-auto"></div></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
