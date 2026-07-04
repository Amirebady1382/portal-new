import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stepper } from "@/components/ui/stepper";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";

const DEPARTMENTS = [
  { value: "investment", label: "واحد سرمایه‌گذاری" },
  { value: "administrative", label: "واحد اداری" },
];

const SERVICE_CATEGORIES = [
  { value: "facilities", label: "تسهیلات" },
  { value: "investment", label: "سرمایه‌گذاری" },
  { value: "guarantee", label: "ضمانت‌نامه" }
];

import { useEffect } from "react";

interface ServiceWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialService?: any;
}

export default function ServiceWizard({ onSuccess, onCancel, initialService }: ServiceWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Service Data
  const [serviceData, setServiceData] = useState({
    title: "",
    description: "",
    department: "investment",
    category: "",
    icon: "Package",
    estimatedDays: "",
    requirements: "", // Required documents description (simple text)
  });

  // State for Selected Forms
  const [selectedForms, setSelectedForms] = useState<number[]>([]);

  // State for existing mappings (to know what to remove on edit)
  const [existingMappings, setExistingMappings] = useState<any[]>([]);

  // Initialize data if editing
  useEffect(() => {
    if (initialService) {
      setServiceData({
        title: initialService.title || "",
        description: initialService.description || "",
        department: initialService.department || "investment",
        category: initialService.category || "",
        icon: initialService.icon || "Package",
        estimatedDays: initialService.estimatedDays?.toString() || "",
        requirements: initialService.requirements || "",
      });
    }
  }, [initialService]);

  // Fetch available forms
  const { data: availableForms = [] } = useQuery<any[]>({
    queryKey: ["/api/document-requirements"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/document-requirements");
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch existing forms for this service if editing
  useQuery({
    queryKey: ["/api/services", initialService?.id, "forms"],
    queryFn: async () => {
      if (!initialService?.id) return null;
      const result = await apiRequest<any>("GET", `/api/services/${initialService.id}/forms`);
      const forms = result?.forms || [];

      setExistingMappings(forms);
      setSelectedForms(forms.map((f: any) => f.documentRequirementId));

      return result;
    },
    enabled: !!initialService?.id,
  });

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let serviceId;

      if (initialService?.id) {
        // UPDATE Service
        await apiRequest("PUT", `/api/services/${initialService.id}`, {
          ...serviceData,
          estimatedDays: serviceData.estimatedDays ? parseInt(serviceData.estimatedDays) : null,
        });
        serviceId = initialService.id;

        // Manage Forms (Diff logic)
        const currentFormIds = existingMappings.map(m => m.documentRequirementId);

        // Forms to ADD
        const toAdd = selectedForms.filter(id => !currentFormIds.includes(id));

        // Forms to REMOVE
        const toRemoveIds = currentFormIds.filter(id => !selectedForms.includes(id));
        const mappingsToRemove = existingMappings.filter(m => toRemoveIds.includes(m.documentRequirementId));

        // Add new
        for (const formId of toAdd) {
          await apiRequest("POST", `/api/services/${serviceId}/forms`, {
            documentRequirementId: formId,
            department: serviceData.department,
            isRequired: true,
          });
        }

        // Remove old
        for (const mapping of mappingsToRemove) {
          await apiRequest("DELETE", `/api/services/forms/${mapping.id}`);
        }

        toast({
          title: "موفق",
          description: "خدمت با موفقیت ویرایش شد",
        });

      } else {
        // CREATE Service
        const serviceResponse = await apiRequest("POST", "/api/services", {
          ...serviceData,
          estimatedDays: serviceData.estimatedDays ? parseInt(serviceData.estimatedDays) : null,
          isActive: true,
          sortOrder: 0,
        });

        serviceId = (serviceResponse as any).id;

        // Add Selected Forms
        for (const formId of selectedForms) {
          await apiRequest("POST", `/api/services/${serviceId}/forms`, {
            documentRequirementId: formId,
            department: serviceData.department,
            isRequired: true,
          });
        }

        toast({
          title: "موفق",
          description: "خدمت با موفقیت ایجاد شد",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره خدمت",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { title: "اطلاعات پایه", description: "تعریف مشخصات کلی خدمت" },
    { title: "انتخاب فرم‌ها", description: "اتصال فرم‌های مورد نیاز" },
    { title: "بازبینی و ثبت", description: "مشاهده و تایید نهایی" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto" dir="rtl">
      <Stepper
        steps={steps}
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) setCurrentStep(step);
        }}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان خدمت <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={serviceData.title}
                  onChange={(e) => setServiceData({ ...serviceData, title: e.target.value })}
                  placeholder="مثال: بررسی طرح کسب و کار"
                />
              </div>

              <div>
                <Label htmlFor="description">توضیحات</Label>
                <Textarea
                  id="description"
                  value={serviceData.description}
                  onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
                  placeholder="توضیحات کامل درباره این خدمت..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">واحد <span className="text-red-500">*</span></Label>
                  <Select
                    value={serviceData.department}
                    onValueChange={(value) => setServiceData({ ...serviceData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">دسته‌بندی</Label>
                  <Select
                    value={serviceData.category}
                    onValueChange={(value) => setServiceData({ ...serviceData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب دسته‌بندی" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedDays">زمان تخمینی (روز)</Label>
                  <Input
                    id="estimatedDays"
                    type="number"
                    value={serviceData.estimatedDays}
                    onChange={(e) => setServiceData({ ...serviceData, estimatedDays: e.target.value })}
                    placeholder="7"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Forms Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                فرم‌هایی که متقاضی باید برای این خدمت تکمیل کند را انتخاب کنید.
                (نمایش فرم‌های مربوط به {DEPARTMENTS.find(d => d.value === serviceData.department)?.label})
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto p-1">
                {availableForms
                  .filter((form) => form.department === serviceData.department || !form.department)
                  .map((form) => (
                    <div
                      key={form.id}
                      className={`flex items-start gap-3 p-4 border rounded-lg transition-colors cursor-pointer ${
                        selectedForms.includes(form.id) ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setSelectedForms(prev =>
                          prev.includes(form.id)
                            ? prev.filter(id => id !== form.id)
                            : [...prev, form.id]
                        );
                      }}
                    >
                      <Checkbox
                        checked={selectedForms.includes(form.id)}
                        onCheckedChange={() => {}} // Handled by div click
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{form.title}</div>
                        <div className="text-sm text-muted-foreground">{form.description}</div>
                      </div>
                    </div>
                  ))}
                {availableForms.filter((form) => form.department === serviceData.department || !form.department).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    هیچ فرمی برای این واحد یافت نشد. لطفاً ابتدا فرم‌ها را در بخش مدیریت فرم‌ها تعریف کنید.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-muted-foreground mb-2">اطلاعات کلی</h3>
                  <div className="space-y-2 text-sm border p-4 rounded-lg bg-gray-50">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عنوان:</span>
                      <span className="font-medium">{serviceData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">واحد:</span>
                      <span className="font-medium">
                        {DEPARTMENTS.find(d => d.value === serviceData.department)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">دسته‌بندی:</span>
                      <span className="font-medium">
                        {SERVICE_CATEGORIES.find(c => c.value === serviceData.category)?.label || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">زمان تخمینی:</span>
                      <span className="font-medium">
                        {serviceData.estimatedDays ? `${serviceData.estimatedDays} روز` : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-muted-foreground mb-2">فرم‌های انتخاب شده</h3>
                  <div className="space-y-2 text-sm border p-4 rounded-lg bg-gray-50 max-h-[200px] overflow-y-auto">
                    {selectedForms.length === 0 ? (
                      <div className="text-muted-foreground text-center py-4">هیچ فرمی انتخاب نشده است</div>
                    ) : (
                      selectedForms.map(id => {
                        const form = availableForms.find(f => f.id === id);
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>{form?.title}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {serviceData.description && (
                <div>
                  <h3 className="font-medium text-muted-foreground mb-2">توضیحات</h3>
                  <div className="p-4 border rounded-lg bg-gray-50 text-sm">
                    {serviceData.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? onCancel : handleBack}
            disabled={isSubmitting}
          >
            {currentStep === 0 ? "انصراف" : "مرحله قبل"}
          </Button>

          <Button
            onClick={handleNext}
            disabled={isSubmitting || (currentStep === 0 && !serviceData.title)}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {currentStep === 2 ? "ایجاد خدمت" : "مرحله بعد"}
            {currentStep < 2 && <ArrowLeft className="h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
