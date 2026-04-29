import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PersianCalendar } from "@/components/ui/persian-calendar";
import { 
  Users, 
  Package, 
  DollarSign, 
  Edit, 
  Save, 
  X,
  Plus,
  Trash2,
  FileSignature
} from "lucide-react";

interface CompanyInfoPanelsProps {
  company: any;
  companyId: number;
}

interface TeamMember {
  name: string;
  position: string;
  experience: string;
  // اضافه کردن فیلدهای جدید برای اطلاعات بیشتر
  education: string;        // تحصیلات
  specialization: string;   // تخصص
  startDate: string;        // تاریخ شروع همکاری
  contactInfo: string;      // اطلاعات تماس
  responsibilities: string; // مسئولیت‌ها
}

interface ProductInfo {
  description: string;
  features: string[];
  targetMarket: string;
  competitiveAdvantage: string;
}

interface FinancialInfo {
  revenue: string;
  funding: string;
  expenses: string;
  profitability: string;
  financialProjection: string;
}

interface Signatory {
  name: string;
  nationalId: string;
  position: string;
}

export default function CompanyInfoPanels({ company, companyId }: CompanyInfoPanelsProps) {
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamMember[]>(
    company.teamInfo ? (JSON.parse(company.teamInfo).members || []).map((member: any) => ({
      name: member.name || "",
      position: member.position || "",
      experience: member.experience || "",
      education: member.education || "",
      specialization: member.specialization || "",
      startDate: member.startDate || "",
      contactInfo: member.contactInfo || "",
      responsibilities: member.responsibilities || ""
    })) : []
  );
  const [productData, setProductData] = useState<ProductInfo>(
    company.productInfo ? JSON.parse(company.productInfo) : {
      description: "",
      features: [],
      targetMarket: "",
      competitiveAdvantage: ""
    }
  );
  const [financialData, setFinancialData] = useState<FinancialInfo>(
    company.financialInfo ? JSON.parse(company.financialInfo) : {
      revenue: "",
      funding: "",
      expenses: "",
      profitability: "",
      financialProjection: ""
    }
  );
  const [signatoriesData, setSignatoriesData] = useState<Signatory[]>(
    company.signatories ? JSON.parse(company.signatories) : [
      { name: "", nationalId: "", position: "" },
      { name: "", nationalId: "", position: "" }
    ]
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateInfoMutation = useMutation({
    mutationFn: async ({ type, data }: { type: string; data: any }) => {
      return apiRequest("PUT", `/api/companies/${companyId}/info/${type}`, {
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "اطلاعات با موفقیت به‌روزرسانی شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      setEditingPanel(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در به‌روزرسانی اطلاعات",
        variant: "destructive",
      });
    },
  });

  const handleSaveTeam = () => {
    updateInfoMutation.mutate({
      type: "teamInfo",
      data: { members: teamData }
    });
  };

  const handleSaveProduct = () => {
    updateInfoMutation.mutate({
      type: "productInfo",
      data: productData
    });
  };

  const handleSaveFinancial = () => {
    updateInfoMutation.mutate({
      type: "financialInfo",
      data: financialData
    });
  };

  const handleSaveSignatories = () => {
    // Validate: maximum 2 signatories
    const validSignatories = signatoriesData.slice(0, 2).filter(s => 
      s.name.trim() !== "" || s.nationalId.trim() !== "" || s.position.trim() !== ""
    );
    
    updateInfoMutation.mutate({
      type: "signatories",
      data: validSignatories
    });
  };

  const addTeamMember = () => {
    setTeamData([...teamData, { 
      name: "", 
      position: "", 
      experience: "",
      education: "",
      specialization: "",
      startDate: "",
      contactInfo: "",
      responsibilities: ""
    }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamData(teamData.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...teamData];
    updated[index][field] = value;
    setTeamData(updated);
  };

  const addProductFeature = () => {
    setProductData({
      ...productData,
      features: [...productData.features, ""]
    });
  };

  const removeProductFeature = (index: number) => {
    setProductData({
      ...productData,
      features: productData.features.filter((_, i) => i !== index)
    });
  };

  const updateProductFeature = (index: number, value: string) => {
    const updated = [...productData.features];
    updated[index] = value;
    setProductData({
      ...productData,
      features: updated
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Team Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 ml-2" />
              اطلاعات تیم
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPanel(editingPanel === "team" ? null : "team")}
            >
              {editingPanel === "team" ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingPanel === "team" ? (
            <div className="space-y-4">
              {teamData.map((member, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>عضو تیم {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTeamMember(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="نام"
                    value={member.name}
                    onChange={(e) => updateTeamMember(index, "name", e.target.value)}
                  />
                  <Input
                    placeholder="سمت"
                    value={member.position}
                    onChange={(e) => updateTeamMember(index, "position", e.target.value)}
                  />
                  <Input
                    placeholder="تجربه"
                    value={member.experience}
                    onChange={(e) => updateTeamMember(index, "experience", e.target.value)}
                  />
                  <Input
                    placeholder="تحصیلات"
                    value={member.education}
                    onChange={(e) => updateTeamMember(index, "education", e.target.value)}
                  />
                  <Input
                    placeholder="تخصص"
                    value={member.specialization}
                    onChange={(e) => updateTeamMember(index, "specialization", e.target.value)}
                  />
                  <div>
                    <PersianCalendar
                      value={member.startDate}
                      onSelect={(date) => updateTeamMember(index, "startDate", date?.toISOString() || "")}
                      placeholder="تاریخ شروع همکاری"
                    />
                  </div>
                  <Input
                    placeholder="اطلاعات تماس"
                    value={member.contactInfo}
                    onChange={(e) => updateTeamMember(index, "contactInfo", e.target.value)}
                  />
                  <Textarea
                    placeholder="مسئولیت‌ها و وظایف"
                    value={member.responsibilities}
                    onChange={(e) => updateTeamMember(index, "responsibilities", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addTeamMember}
                className="w-full"
              >
                <Plus className="h-4 w-4 ml-1" />
                افزودن عضو تیم
              </Button>
              <div className="flex space-x-2 space-x-reverse">
                <Button
                  onClick={handleSaveTeam}
                  disabled={updateInfoMutation.isPending}
                >
                  <Save className="h-4 w-4 ml-1" />
                  {updateInfoMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingPanel(null)}
                >
                  لغو
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {teamData.length > 0 ? (
                teamData.map((member, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border space-y-2">
                    <div className="font-bold text-lg text-blue-700">{member.name}</div>
                    <div className="text-base text-gray-800">{member.position}</div>
                    {member.specialization && (
                      <div className="text-sm text-purple-600">
                        <span className="font-medium">تخصص:</span> {member.specialization}
                      </div>
                    )}
                    {member.education && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">تحصیلات:</span> {member.education}
                      </div>
                    )}
                    {member.experience && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">سابقه:</span> {member.experience}
                      </div>
                    )}
                    {member.startDate && (
                      <div className="text-sm text-green-600">
                        <span className="font-medium">شروع همکاری:</span> {member.startDate}
                      </div>
                    )}
                    {member.contactInfo && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">تماس:</span> {member.contactInfo}
                      </div>
                    )}
                    {member.responsibilities && (
                      <div className="text-sm text-gray-700 bg-white p-2 rounded border-l-4 border-blue-400">
                        <span className="font-medium">مسئولیت‌ها:</span>
                        <div className="mt-1">{member.responsibilities}</div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  اطلاعات تیم ثبت نشده است
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 ml-2" />
              اطلاعات محصول
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPanel(editingPanel === "product" ? null : "product")}
            >
              {editingPanel === "product" ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingPanel === "product" ? (
            <div className="space-y-4">
              <div>
                <Label>توضیحات محصول</Label>
                <Textarea
                  placeholder="توضیحات کامل محصول یا خدمات..."
                  value={productData.description}
                  onChange={(e) => setProductData({...productData, description: e.target.value})}
                />
              </div>
              
              <div>
                <Label>ویژگی‌های محصول</Label>
                {productData.features.map((feature, index) => (
                  <div key={index} className="flex space-x-2 space-x-reverse mb-2">
                    <Input
                      placeholder="ویژگی محصول"
                      value={feature}
                      onChange={(e) => updateProductFeature(index, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductFeature(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addProductFeature}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 ml-1" />
                  افزودن ویژگی
                </Button>
              </div>

              <div>
                <Label>بازار هدف</Label>
                <Input
                  placeholder="بازار هدف محصول..."
                  value={productData.targetMarket}
                  onChange={(e) => setProductData({...productData, targetMarket: e.target.value})}
                />
              </div>

              <div>
                <Label>مزیت رقابتی</Label>
                <Textarea
                  placeholder="مزیت رقابتی محصول..."
                  value={productData.competitiveAdvantage}
                  onChange={(e) => setProductData({...productData, competitiveAdvantage: e.target.value})}
                />
              </div>

              <div className="flex space-x-2 space-x-reverse">
                <Button
                  onClick={handleSaveProduct}
                  disabled={updateInfoMutation.isPending}
                >
                  <Save className="h-4 w-4 ml-1" />
                  {updateInfoMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingPanel(null)}
                >
                  لغو
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {productData.description ? (
                <>
                  <div>
                    <Label className="text-sm font-medium">توضیحات:</Label>
                    <p className="text-sm text-gray-600 mt-1">{productData.description}</p>
                  </div>
                  
                  {productData.features.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">ویژگی‌ها:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {productData.features.map((feature, index) => (
                          <Badge key={index} variant="secondary">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {productData.targetMarket && (
                    <div>
                      <Label className="text-sm font-medium">بازار هدف:</Label>
                      <p className="text-sm text-gray-600 mt-1">{productData.targetMarket}</p>
                    </div>
                  )}
                  
                  {productData.competitiveAdvantage && (
                    <div>
                      <Label className="text-sm font-medium">مزیت رقابتی:</Label>
                      <p className="text-sm text-gray-600 mt-1">{productData.competitiveAdvantage}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  اطلاعات محصول ثبت نشده است
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 ml-2" />
              اطلاعات مالی
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPanel(editingPanel === "financial" ? null : "financial")}
            >
              {editingPanel === "financial" ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingPanel === "financial" ? (
            <div className="space-y-4">
              <div>
                <Label>درآمد سالانه</Label>
                <Input
                  placeholder="درآمد سالانه..."
                  value={financialData.revenue}
                  onChange={(e) => setFinancialData({...financialData, revenue: e.target.value})}
                />
              </div>
              
              <div>
                <Label>تامین مالی</Label>
                <Input
                  placeholder="وضعیت تامین مالی..."
                  value={financialData.funding}
                  onChange={(e) => setFinancialData({...financialData, funding: e.target.value})}
                />
              </div>

              <div>
                <Label>هزینه‌ها</Label>
                <Input
                  placeholder="هزینه‌های عملیاتی..."
                  value={financialData.expenses}
                  onChange={(e) => setFinancialData({...financialData, expenses: e.target.value})}
                />
              </div>

              <div>
                <Label>سودآوری</Label>
                <Input
                  placeholder="وضعیت سودآوری..."
                  value={financialData.profitability}
                  onChange={(e) => setFinancialData({...financialData, profitability: e.target.value})}
                />
              </div>

              <div>
                <Label>پیش‌بینی مالی</Label>
                <Textarea
                  placeholder="پیش‌بینی‌های مالی..."
                  value={financialData.financialProjection}
                  onChange={(e) => setFinancialData({...financialData, financialProjection: e.target.value})}
                />
              </div>

              <div className="flex space-x-2 space-x-reverse">
                <Button
                  onClick={handleSaveFinancial}
                  disabled={updateInfoMutation.isPending}
                >
                  <Save className="h-4 w-4 ml-1" />
                  {updateInfoMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingPanel(null)}
                >
                  لغو
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {financialData.revenue || financialData.funding || financialData.expenses || financialData.profitability || financialData.financialProjection ? (
                <>
                  {financialData.revenue && (
                    <div>
                      <Label className="text-sm font-medium">درآمد سالانه:</Label>
                      <p className="text-sm text-gray-600 mt-1">{financialData.revenue}</p>
                    </div>
                  )}
                  
                  {financialData.funding && (
                    <div>
                      <Label className="text-sm font-medium">تامین مالی:</Label>
                      <p className="text-sm text-gray-600 mt-1">{financialData.funding}</p>
                    </div>
                  )}
                  
                  {financialData.expenses && (
                    <div>
                      <Label className="text-sm font-medium">هزینه‌ها:</Label>
                      <p className="text-sm text-gray-600 mt-1">{financialData.expenses}</p>
                    </div>
                  )}
                  
                  {financialData.profitability && (
                    <div>
                      <Label className="text-sm font-medium">سودآوری:</Label>
                      <p className="text-sm text-gray-600 mt-1">{financialData.profitability}</p>
                    </div>
                  )}
                  
                  {financialData.financialProjection && (
                    <div>
                      <Label className="text-sm font-medium">پیش‌بینی مالی:</Label>
                      <p className="text-sm text-gray-600 mt-1">{financialData.financialProjection}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  اطلاعات مالی ثبت نشده است
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorized Signatories Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <CardTitle>حق امضاداران</CardTitle>
            <Badge variant="outline" className="mr-2">حداکثر 2 نفر</Badge>
          </div>
          {editingPanel !== "signatories" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingPanel("signatories")}
            >
              <Edit className="h-4 w-4 ml-1" />
              ویرایش
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingPanel === "signatories" ? (
            <div className="space-y-4">
              {[0, 1].map((index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    حق امضای {index === 0 ? "اول" : "دوم"}
                    {index === 1 && <span className="text-xs text-gray-500">(اختیاری)</span>}
                  </h4>
                  
                  <div>
                    <Label className="text-sm">نام و نام خانوادگی</Label>
                    <Input
                      value={signatoriesData[index]?.name || ""}
                      onChange={(e) => {
                        const newData = [...signatoriesData];
                        if (!newData[index]) newData[index] = { name: "", nationalId: "", position: "" };
                        newData[index].name = e.target.value;
                        setSignatoriesData(newData);
                      }}
                      placeholder="نام کامل حق امضا"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">کد ملی</Label>
                    <Input
                      value={signatoriesData[index]?.nationalId || ""}
                      onChange={(e) => {
                        const newData = [...signatoriesData];
                        if (!newData[index]) newData[index] = { name: "", nationalId: "", position: "" };
                        newData[index].nationalId = e.target.value;
                        setSignatoriesData(newData);
                      }}
                      placeholder="کد ملی 10 رقمی"
                      maxLength={10}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">سمت</Label>
                    <Input
                      value={signatoriesData[index]?.position || ""}
                      onChange={(e) => {
                        const newData = [...signatoriesData];
                        if (!newData[index]) newData[index] = { name: "", nationalId: "", position: "" };
                        newData[index].position = e.target.value;
                        setSignatoriesData(newData);
                      }}
                      placeholder="مثال: مدیرعامل، عضو هیئت مدیره"
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveSignatories}
                  disabled={updateInfoMutation.isPending}
                >
                  <Save className="h-4 w-4 ml-1" />
                  {updateInfoMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingPanel(null)}
                >
                  لغو
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {signatoriesData && signatoriesData.some(s => s.name || s.nationalId || s.position) ? (
                <div className="space-y-4">
                  {signatoriesData.filter(s => s.name || s.nationalId || s.position).map((signatory, index) => (
                    <div key={index} className="border-r-4 border-primary pr-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileSignature className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">حق امضای {index + 1}</span>
                      </div>
                      {signatory.name && (
                        <div className="mb-1">
                          <span className="text-xs text-gray-500">نام: </span>
                          <span className="text-sm">{signatory.name}</span>
                        </div>
                      )}
                      {signatory.nationalId && (
                        <div className="mb-1">
                          <span className="text-xs text-gray-500">کد ملی: </span>
                          <span className="text-sm number-font">{signatory.nationalId}</span>
                        </div>
                      )}
                      {signatory.position && (
                        <div>
                          <span className="text-xs text-gray-500">سمت: </span>
                          <span className="text-sm">{signatory.position}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  اطلاعات حق امضاداران ثبت نشده است
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}