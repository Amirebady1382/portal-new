import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import GeneralDocumentUpload from "@/components/documents/general-document-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import { PersianCalendar } from "@/components/ui/persian-calendar";
import { 
  Building, 
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Edit,
  Link,
  RefreshCw,
  Search,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Users
  } from "lucide-react";

interface BoardMember {
  nationalId: string;
  fullName: string;
  position: string;
  isVerified: boolean;
  rasmioData?: any;
}

interface TeamMember {
  name: string;
  position: string;
  experience: string;
  education: string;
  specialization: string;
  startDate: string;
  contactInfo: string;
  responsibilities: string;
}

interface RasmioCompanyData {
  id: number;
  title: string;
  registrationNo: string;
  registrationDate: string;
  capital: number;
  address: string;
  postalCode: string;
  tel?: string;
  mobile?: string;
  email?: string;
  status: string;
  registrationType?: {
    title: string;
    wordUsedToShow: string;
  };
  persianRegistrationDate?: string;
}

// AssociateCompanyForm component
function AssociateCompanyForm() {
  const [nationalId, setNationalId] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const associateMutation = useMutation({
    mutationFn: async (nationalId: string) => {
      return await apiRequest("POST", "/api/companies/associate", { nationalId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/company"] });
      toast({
        title: "موفق",
        description: data.message,
      });
      setNationalId("");
      // Refresh page after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssociate = () => {
    if (!nationalId.trim()) {
      toast({
        title: "خطا",
        description: "شناسه ملی الزامی است",
        variant: "destructive",
      });
      return;
    }
    associateMutation.mutate(nationalId.trim());
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="associate-national-id">شناسه ملی شرکت</Label>
        <Input
          id="associate-national-id"
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value)}
          placeholder="شناسه ملی 11 رقمی شرکت"
          maxLength={11}
        />
      </div>
      <Button 
        onClick={handleAssociate}
        disabled={associateMutation.isPending}
        className="w-full"
      >
        <Link className="h-4 w-4 ml-2" />
        {associateMutation.isPending ? "در حال اتصال..." : "اتصال شرکت"}
      </Button>
    </div>
  );
}

export default function CustomerProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingRasmio, setIsLoadingRasmio] = useState(false);
  const [rasmioData, setRasmioData] = useState<RasmioCompanyData | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [newMemberNationalId, setNewMemberNationalId] = useState("");
  const [newMemberPosition, setNewMemberPosition] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  // Team Members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newTeamMember, setNewTeamMember] = useState<TeamMember>({
    name: "",
    position: "",
    experience: "",
    education: "",
    specialization: "",
    startDate: "",
    contactInfo: "",
    responsibilities: ""
  });
  
  const [companyForm, setCompanyForm] = useState({
    name: "",
    nationalId: "",
    type: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    registrationNumber: "",
    registrationDate: "",
    capital: "",
    primaryUnit: "investment",
    establishedYear: "",
    employeeCount: ""
  });

  // Get user's company data
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  const userCompany = (companies as any[]).length > 0 ? (companies as any[])[0] : null;

  // Load existing company data when available
  useEffect(() => {
    if (userCompany) {
      setCompanyForm({
        name: userCompany.name || "",
        nationalId: userCompany.nationalId || "",
        type: userCompany.type || "",
        description: userCompany.description || "",
        address: userCompany.address || "",
        city: userCompany.city || "",
        phone: userCompany.phone || "",
        email: userCompany.email || "",
        website: userCompany.website || "",
        registrationNumber: userCompany.registrationNumber || "",
        registrationDate: userCompany.registrationDate || "",
        capital: userCompany.capital || "",
        primaryUnit: userCompany.primaryUnit || "investment",
        establishedYear: userCompany.establishedYear?.toString() || "",
        employeeCount: userCompany.employeeCount?.toString() || ""
      });

      // Load board members if they exist in rasmioData
      if (userCompany.rasmioData) {
        try {
          const parsedRasmioData = JSON.parse(userCompany.rasmioData);
          if (parsedRasmioData.boardMembers) {
            setBoardMembers(parsedRasmioData.boardMembers);
          }
        } catch (e) {
          console.error("خطا در پارس کردن اطلاعات رسمیو:", e);
        }
      }

      // Load team members if they exist in teamInfo
      if (userCompany.teamInfo) {
        try {
          const parsedTeamInfo = JSON.parse(userCompany.teamInfo);
          if (parsedTeamInfo.members) {
            setTeamMembers(parsedTeamInfo.members.map((member: any) => ({
              name: member.name || "",
              position: member.position || "",
              experience: member.experience || "",
              education: member.education || "",
              specialization: member.specialization || "",
              startDate: member.startDate || "",
              contactInfo: member.contactInfo || "",
              responsibilities: member.responsibilities || ""
            })));
          }
        } catch (e) {
          console.error("خطا در پارس کردن اطلاعات تیم:", e);
        }
      }
    }
  }, [userCompany]);

  // Fetch company data from Rasmio API
  const fetchRasmioData = async () => {
    if (!companyForm.nationalId || companyForm.nationalId.length !== 11) {
      toast({
        title: "خطا",
        description: "لطفاً شناسه ملی ۱۱ رقمی شرکت را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingRasmio(true);
    try {
      const data = await apiRequest("GET", `/api/rasmio/company/${companyForm.nationalId}`);
      const members = await apiRequest("GET", `/api/rasmio/company/${companyForm.nationalId}/members`);

      if (data.basicInfo) {
        setRasmioData(data.basicInfo);
        
        // Auto-fill form with Rasmio data
        setCompanyForm(prev => ({
          ...prev,
          name: data.basicInfo.title || prev.name,
          registrationNumber: data.basicInfo.registrationNo || prev.registrationNumber,
          registrationDate: data.basicInfo.persianRegistrationDate || prev.registrationDate,
          capital: data.basicInfo.capital?.toString() || prev.capital,
          address: data.basicInfo.address || prev.address,
          phone: data.basicInfo.tel || prev.phone,
          email: data.basicInfo.email || prev.email,
          type: data.basicInfo.registrationType?.wordUsedToShow || prev.type
        }));

        // Auto-fill board members
        if (Array.isArray(members)) {
          // Group positions by personId
          const personPositions = new Map<string, any[]>();
          members.forEach(m => {
            const pid = m.person?.id?.toString();
            if (pid) {
              if (!personPositions.has(pid)) personPositions.set(pid, []);
              personPositions.get(pid)!.push(m);
            }
          });

          const deduplicatedMembers: BoardMember[] = [];
          
          personPositions.forEach((positions, pid) => {
            // A person is active if at least one of their positions does not have an endDate
            const isActive = positions.some(p => !p.endDate);
            
            // Get the latest position based on startDate
            const latest = [...positions].sort((a, b) => 
              new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
            )[0];

            deduplicatedMembers.push({
              nationalId: pid,
              fullName: latest.person?.title || "نامشخص",
              position: latest.position?.title || "عضو",
              isVerified: true,
              rasmioData: { 
                ...latest, 
                // Only mark as past if they have NO active positions
                endDate: isActive ? null : latest.endDate 
              }
            });
          });

          setBoardMembers(deduplicatedMembers);
        }

        toast({
          title: "موفق",
          description: "اطلاعات شرکت و اعضای هیئت مدیره از رسمیو دریافت شد",
        });
      } else {
        throw new Error(data.error || 'اطلاعاتی یافت نشد');
      }
    } catch (error: any) {
      toast({
        title: "خطا در دریافت اطلاعات رسمیو",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingRasmio(false);
    }
  };

  // Add board member by national ID
  const addBoardMember = async () => {
    if (!newMemberNationalId || newMemberNationalId.length !== 10) {
      toast({
        title: "خطا",
        description: "لطفاً کد ملی ۱۰ رقمی را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    if (!newMemberPosition) {
      toast({
        title: "خطا",
        description: "لطفاً سمت فرد را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    // Check if member already exists
    if (boardMembers.find(m => m.nationalId === newMemberNationalId)) {
      toast({
        title: "خطا",
        description: "این فرد قبلاً اضافه شده است",
        variant: "destructive",
      });
      return;
    }

    setIsAddingMember(true);
    try {
      const response = await apiRequest("GET", `/api/rasmio/person/${newMemberNationalId}`);

      let personData = null;
      let isVerified = false;
      let fullName = "نامشخص";

      if (response.ok) {
        ;
        if (data.title) {
          personData = data;
          fullName = data.title;
          isVerified = true;
        }
      }

      const newMember: BoardMember = {
        nationalId: newMemberNationalId,
        fullName,
        position: newMemberPosition,
        isVerified,
        rasmioData: personData
      };

      setBoardMembers(prev => [...prev, newMember]);
      setNewMemberNationalId("");
      setNewMemberPosition("");

      toast({
        title: "موفق",
        description: isVerified 
          ? `${fullName} به عنوان ${newMemberPosition} اضافه شد`
          : "عضو اضافه شد (اطلاعات رسمیو یافت نشد)",
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در افزودن عضو هیئت مدیره",
        variant: "destructive",
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remove board member
  const removeBoardMember = (nationalId: string) => {
    setBoardMembers(prev => prev.filter(m => m.nationalId !== nationalId));
  };

  // Team members functions
  const addTeamMember = () => {
    if (!newTeamMember.name.trim()) {
      toast({
        title: "خطا",
        description: "لطفاً نام عضو تیم را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    if (!newTeamMember.position.trim()) {
      toast({
        title: "خطا", 
        description: "لطفاً سمت عضو تیم را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    setTeamMembers(prev => [...prev, { ...newTeamMember }]);
    setNewTeamMember({
      name: "",
      position: "",
      experience: "",
      education: "",
      specialization: "",
      startDate: "",
      contactInfo: "",
      responsibilities: ""
    });

    toast({
      title: "موفق",
      description: `${newTeamMember.name} به تیم اضافه شد`,
    });
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const companyData = {
        ...data,
        rasmioData: JSON.stringify({
          ...rasmioData,
          boardMembers,
          lastUpdated: new Date().toISOString()
        }),
        teamInfo: JSON.stringify({
          members: teamMembers,
          lastUpdated: new Date().toISOString()
        })
      };

      if (userCompany) {
        return apiRequest("PATCH", `/api/companies/${userCompany.id}`, companyData);
      } else {
        // For new companies, set status as pending for admin/employee approval
        const newCompanyData = {
          ...companyData,
          status: "pending"
        };
        return apiRequest("POST", "/api/companies", newCompanyData);
      }
    },
    onSuccess: () => {
      if (userCompany) {
      toast({
        title: "موفقیت",
          description: "اطلاعات شرکت به‌روزرسانی شد",
        });
      } else {
        toast({
          title: "شرکت ثبت شد",
          description: "شرکت شما برای تایید به مدیر ارسال شد. پس از تایید، امکان استفاده از خدمات فراهم خواهد شد.",
      });
      }
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      
      // Redirect to dashboard after successful completion
        setTimeout(() => {
        setLocation("/customer");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره اطلاعات",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!companyForm.name || !companyForm.nationalId) {
      toast({
        title: "فیلدهای الزامی",
        description: "نام شرکت و شناسه ملی الزامی است",
        variant: "destructive",
      });
      return;
    }

    const finalData = {
      ...companyForm,
      establishedYear: companyForm.establishedYear ? parseInt(companyForm.establishedYear) : null,
      employeeCount: companyForm.employeeCount ? parseInt(companyForm.employeeCount) : null
    };

    updateCompanyMutation.mutate(finalData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div>در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
                {userCompany ? "ویرایش اطلاعات شرکت" : "تکمیل اطلاعات شرکت"}
            </h1>
            <p className="text-text-secondary">
                {userCompany 
                  ? "اطلاعات شرکت خود را ویرایش کنید"
                  : "برای شروع، اطلاعات شرکت خود را تکمیل کنید"
                }
            </p>
          </div>

            <div className="space-y-6">
              {/* Company Basic Info */}
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    اطلاعات پایه شرکت
                </CardTitle>
              </CardHeader>
                <CardContent className="space-y-4">
                  {/* National ID & Rasmio Fetch */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="nationalId">شناسه ملی شرکت *</Label>
                      <Input
                        id="nationalId"
                        value={companyForm.nationalId}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, nationalId: e.target.value }))}
                        placeholder="شناسه ملی ۱۱ رقمی"
                        maxLength={11}
                        className="font-mono"
                      />
                </div>
                    <div className="flex items-end">
                  <Button
                        onClick={fetchRasmioData}
                        disabled={isLoadingRasmio || !companyForm.nationalId}
                        className="w-full"
                    variant="outline"
                  >
                        <RefreshCw className={`h-4 w-4 ml-2 ${isLoadingRasmio ? 'animate-spin' : ''}`} />
                        {isLoadingRasmio ? "در حال دریافت..." : "دریافت از رسمیو"}
                  </Button>
              </div>
                  </div>

                  {/* Rasmio Status */}
                  {rasmioData && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        اطلاعات از رسمیو دریافت شد. نام رسمی: <strong>{rasmioData.title}</strong>
                        {rasmioData.status && (
                          <Badge className="mr-2" variant={rasmioData.status === 'فعال' ? 'default' : 'secondary'}>
                            {rasmioData.status}
                          </Badge>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Company Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">نام شرکت *</Label>
                  <Input
                    id="name"
                    value={companyForm.name}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="نام کامل شرکت"
                  />
                </div>
                <div>
                      <Label htmlFor="type">نوع شرکت</Label>
                  <Input
                        id="type"
                        value={companyForm.type}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, type: e.target.value }))}
                        placeholder="سهامی خاص، با مسئولیت محدود، ..."
                  />
                </div>
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registrationNumber">شماره ثبت</Label>
                  <Input
                    id="registrationNumber"
                    value={companyForm.registrationNumber}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    placeholder="شماره ثبت شرکت"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationDate">تاریخ ثبت</Label>
                      <Input
                        id="registrationDate"
                        value={companyForm.registrationDate}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, registrationDate: e.target.value }))}
                        placeholder="۱۴۰۰/۰۱/۰۱"
                      />
                    </div>
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capital">سرمایه (ریال)</Label>
                  <Input
                    id="capital"
                    value={companyForm.capital}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, capital: e.target.value }))}
                        placeholder="مبلغ سرمایه به ریال"
                        className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">آدرس</Label>
                <Textarea
                  id="address"
                  value={companyForm.address}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="آدرس کامل شرکت"
                  rows={3}
                />
              </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="phone">تلفن</Label>
                      <Input
                        id="phone"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="۰۲۱۱۲۳۴۵۶۷۸"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">ایمیل</Label>
                      <Input
                        id="email"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="info@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">وب‌سایت</Label>
                      <Input
                        id="website"
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="www.example.com"
                      />
                    </div>
                  </div>

              <div>
                <Label htmlFor="description">توضیحات</Label>
                <Textarea
                  id="description"
                  value={companyForm.description}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="توضیحاتی در مورد فعالیت شرکت"
                      rows={3}
                />
              </div>
                </CardContent>
              </Card>

              {/* Board Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    اعضای هیئت مدیره
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Member */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="memberNationalId">کد ملی</Label>
                        <Input
                          id="memberNationalId"
                          value={newMemberNationalId}
                          onChange={(e) => setNewMemberNationalId(e.target.value)}
                          placeholder="کد ملی ۱۰ رقمی"
                          maxLength={10}
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="memberPosition">سمت</Label>
                        <Input
                          id="memberPosition"
                          value={newMemberPosition}
                          onChange={(e) => setNewMemberPosition(e.target.value)}
                          placeholder="مدیرعامل، رئیس هیئت مدیره، ..."
                        />
                      </div>
                      <div className="flex items-end">
                  <Button 
                          onClick={addBoardMember}
                          disabled={isAddingMember}
                          className="w-full"
                  >
                          <Plus className={`h-4 w-4 ml-2 ${isAddingMember ? 'animate-spin' : ''}`} />
                          {isAddingMember ? "در حال افزودن..." : "افزودن"}
                  </Button>
                </div>
                    </div>
                  </div>

                  {/* Members List */}
                  {boardMembers.length > 0 && (
                    <div className="space-y-3">
                      {boardMembers.map((member, index) => (
                        <div key={member.nationalId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {member.isVerified ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                              )}
                              <span className={`font-medium ${member.rasmioData?.endDate ? 'text-red-600' : ''}`}>
                                {member.fullName}
                                {member.rasmioData?.endDate && <span className="text-xs mr-2">(سابق)</span>}
                              </span>
                            </div>
                            <Badge variant="outline">{member.position}</Badge>
                            <span className="text-sm text-gray-500 font-mono">
                              {toPersianNumber(member.nationalId)}
                            </span>
                          </div>
                  <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBoardMember(member.nationalId)}
                  >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {boardMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>هنوز عضوی اضافه نشده است</p>
                </div>
              )}
            </CardContent>
          </Card>

              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    اعضای تیم
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    اطلاعات اعضای تیم اجرایی و کارمندان کلیدی شرکت
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Team Member */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="teamMemberName">نام و نام خانوادگی *</Label>
                        <Input
                          id="teamMemberName"
                          value={newTeamMember.name}
                          onChange={(e) => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="نام کامل عضو تیم"
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamMemberPosition">سمت *</Label>
                        <Input
                          id="teamMemberPosition"
                          value={newTeamMember.position}
                          onChange={(e) => setNewTeamMember(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="مدیر فنی، کارشناس، ..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamMemberEducation">تحصیلات</Label>
                        <Input
                          id="teamMemberEducation"
                          value={newTeamMember.education}
                          onChange={(e) => setNewTeamMember(prev => ({ ...prev, education: e.target.value }))}
                          placeholder="مهندسی کامپیوتر، MBA، ..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamMemberSpecialization">تخصص</Label>
                        <Input
                          id="teamMemberSpecialization"
                          value={newTeamMember.specialization}
                          onChange={(e) => setNewTeamMember(prev => ({ ...prev, specialization: e.target.value }))}
                          placeholder="هوش مصنوعی، مدیریت پروژه، ..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamMemberExperience">سابقه کار</Label>
                        <Input
                          id="teamMemberExperience"
                          value={newTeamMember.experience}
                          onChange={(e) => setNewTeamMember(prev => ({ ...prev, experience: e.target.value }))}
                          placeholder="۵ سال، ۱۰ سال، ..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamMemberStartDate">تاریخ شروع همکاری</Label>
                        <PersianCalendar
                          value={newTeamMember.startDate}
                          onSelect={(date) => setNewTeamMember(prev => ({ ...prev, startDate: date?.toISOString() || "" }))}
                          placeholder="انتخاب تاریخ شروع همکاری"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="teamMemberContact">اطلاعات تماس</Label>
                        <Input
                          id="teamMemberContact"
                          value={newTeamMember.contactInfo}
                          onChange={(e) => setNewTeamMember(prev => ({ ...prev, contactInfo: e.target.value }))}
                          placeholder="ایمیل، تلفن، ..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="teamMemberResponsibilities">مسئولیت‌ها و وظایف</Label>
                        <Textarea
                          id="teamMemberResponsibilities"
                          value={newTeamMember.responsibilities}
                          onChange={(e) => setNewTeamMember(prev => ({ ...prev, responsibilities: e.target.value }))}
                          placeholder="شرح وظایف و مسئولیت‌های این عضو..."
                          rows={3}
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button onClick={addTeamMember} className="w-full md:w-auto">
                          <Plus className="h-4 w-4 ml-2" />
                          افزودن عضو تیم
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Team Members List */}
                  {teamMembers.length > 0 && (
                    <div className="space-y-3">
                      {teamMembers.map((member, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <h4 className="font-bold text-lg text-blue-700">{member.name}</h4>
                                <Badge variant="outline">{member.position}</Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {member.education && (
                                  <div>
                                    <span className="font-medium text-gray-600">تحصیلات:</span> {member.education}
                                  </div>
                                )}
                                {member.specialization && (
                                  <div>
                                    <span className="font-medium text-gray-600">تخصص:</span> {member.specialization}
                                  </div>
                                )}
                                {member.experience && (
                                  <div>
                                    <span className="font-medium text-gray-600">سابقه:</span> {member.experience}
                                  </div>
                                )}
                                {member.startDate && (
                                  <div>
                                    <span className="font-medium text-gray-600">شروع همکاری:</span> {member.startDate}
                                  </div>
                                )}
                                {member.contactInfo && (
                                  <div className="md:col-span-2">
                                    <span className="font-medium text-gray-600">تماس:</span> {member.contactInfo}
                                  </div>
                                )}
                              </div>
                              
                              {member.responsibilities && (
                                <div className="mt-3 p-3 bg-white rounded border-l-4 border-blue-400">
                                  <span className="font-medium text-gray-600">مسئولیت‌ها:</span>
                                  <p className="mt-1 text-gray-700">{member.responsibilities}</p>
                                </div>
                              )}
                            </div>
                            
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTeamMember(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {teamMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>هنوز عضو تیمی اضافه نشده است</p>
                      <p className="text-sm mt-1">اطلاعات اعضای تیم در تحلیل‌های هوش مصنوعی استفاده می‌شود</p>
                </div>
              )}
            </CardContent>
          </Card>

              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <Button
                      onClick={handleSave}
                      disabled={updateCompanyMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 ml-2" />
                      {updateCompanyMutation.isPending 
                        ? "در حال ذخیره..." 
                        : userCompany ? "به‌روزرسانی اطلاعات" : "ثبت شرکت"
                      }
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/customer")}
                      disabled={updateCompanyMutation.isPending}
                    >
                      انصراف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
