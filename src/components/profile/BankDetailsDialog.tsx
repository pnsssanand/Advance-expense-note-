import { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { MaskedBankDetails } from '@/types/expense';
import {
  encryptData,
  decryptData,
  maskAccountNumber,
  maskCardNumber,
  formatCardNumber,
  formatExpiryDate,
  validateIFSC,
  validateExpiryDate,
  validateCVV,
  validatePIN,
  validateAccountNumber,
  validateCardNumber,
} from '@/lib/encryption';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  CreditCard,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  Save,
  X,
  Edit2,
  Shield,
  AlertCircle,
  Loader2,
  Check,
  Lock,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Copy,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BankDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormErrors {
  accountHolderName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  debitCardNumber?: string;
  cardExpiryDate?: string;
  cvv?: string;
  atmPin?: string;
  registeredMobileNumber?: string;
  mobileAppLoginPin?: string;
  mobileBankingPin?: string;
  netBankingUserId?: string;
  netBankingPassword?: string;
}

interface FieldVisibility {
  bankAccountNumber: boolean;
  debitCardNumber: boolean;
  cvv: boolean;
  atmPin: boolean;
  registeredMobileNumber: boolean;
  mobileAppLoginPin: boolean;
  mobileBankingPin: boolean;
  netBankingUserId: boolean;
  netBankingPassword: boolean;
}

type ViewMode = 'list' | 'view' | 'edit' | 'add';

export function BankDetailsDialog({ open, onOpenChange }: BankDetailsDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankDetailsList, setBankDetailsList] = useState<MaskedBankDetails[]>([]);
  const [currentBankId, setCurrentBankId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    customerId: '',
    bankAccountNumber: '',
    ifscCode: '',
    debitCardNumber: '',
    cardExpiryDate: '',
    cvv: '',
    atmPin: '',
    registeredMobileNumber: '',
    mobileAppLoginPin: '',
    mobileBankingPin: '',
    netBankingUserId: '',
    netBankingPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  
  const [visibility, setVisibility] = useState<FieldVisibility>({
    bankAccountNumber: false,
    debitCardNumber: false,
    cvv: false,
    atmPin: false,
    registeredMobileNumber: false,
    mobileAppLoginPin: false,
    mobileBankingPin: false,
    netBankingUserId: false,
    netBankingPassword: false,
  });

  // Load all bank details
  useEffect(() => {
    if (open && user) {
      loadAllBankDetails();
    }
  }, [open, user]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setViewMode('list');
      setCurrentBankId(null);
      setErrors({});
      resetVisibility();
    }
  }, [open]);

  const resetVisibility = () => {
    setVisibility({
      bankAccountNumber: false,
      debitCardNumber: false,
      cvv: false,
      atmPin: false,
      registeredMobileNumber: false,
      mobileAppLoginPin: false,
      mobileBankingPin: false,
      netBankingUserId: false,
      netBankingPassword: false,
    });
  };

  const loadAllBankDetails = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const banksRef = collection(db, 'users', user.uid, 'bankDetails');
      const banksSnap = await getDocs(banksRef);
      
      const banks: MaskedBankDetails[] = [];
      
      for (const docSnap of banksSnap.docs) {
        const data = docSnap.data();
        const decryptedAccountNumber = decryptData(data.bankAccountNumber || '', user.uid);
        const decryptedCardNumber = decryptData(data.debitCardNumber || '', user.uid);
        
        banks.push({
          id: docSnap.id,
          accountHolderName: data.accountHolderName || '',
          bankName: data.bankName || '',
          customerId: data.customerId || '',
          bankAccountNumberMasked: maskAccountNumber(decryptedAccountNumber),
          ifscCode: data.ifscCode || '',
          debitCardNumberMasked: maskCardNumber(decryptedCardNumber),
          cardExpiryDate: data.cardExpiryDate || '',
          hasCvv: !!data.cvv,
          hasAtmPin: !!data.atmPin,
          hasRegisteredMobileNumber: !!data.registeredMobileNumber,
          hasMobileAppLoginPin: !!data.mobileAppLoginPin,
          hasMobileBankingPin: !!data.mobileBankingPin,
          hasNetBankingUserId: !!data.netBankingUserId,
          hasNetBankingPassword: !!data.netBankingPassword,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      }
      
      // Sort by creation date (newest first)
      banks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setBankDetailsList(banks);
    } catch (error) {
      console.error('Error loading bank details:', error);
      toast.error('Failed to load bank details');
    } finally {
      setLoading(false);
    }
  };

  const loadSingleBankDetails = async (bankId: string) => {
    if (!user) return;

    try {
      const bankRef = doc(db, 'users', user.uid, 'bankDetails', bankId);
      const bankSnap = await getDoc(bankRef);

      if (bankSnap.exists()) {
        const data = bankSnap.data();
        
        setFormData({
          accountHolderName: data.accountHolderName || '',
          bankName: data.bankName || '',
          customerId: data.customerId || '',
          bankAccountNumber: decryptData(data.bankAccountNumber || '', user.uid),
          ifscCode: data.ifscCode || '',
          debitCardNumber: decryptData(data.debitCardNumber || '', user.uid),
          cardExpiryDate: data.cardExpiryDate || '',
          cvv: decryptData(data.cvv || '', user.uid),
          atmPin: decryptData(data.atmPin || '', user.uid),
          registeredMobileNumber: decryptData(data.registeredMobileNumber || '', user.uid),
          mobileAppLoginPin: decryptData(data.mobileAppLoginPin || '', user.uid),
          mobileBankingPin: decryptData(data.mobileBankingPin || '', user.uid),
          netBankingUserId: decryptData(data.netBankingUserId || '', user.uid),
          netBankingPassword: decryptData(data.netBankingPassword || '', user.uid),
        });
      }
    } catch (error) {
      console.error('Error loading bank details:', error);
      toast.error('Failed to load bank details');
    }
  };

  const resetForm = () => {
    setFormData({
      accountHolderName: '',
      bankName: '',
      customerId: '',
      bankAccountNumber: '',
      ifscCode: '',
      debitCardNumber: '',
      cardExpiryDate: '',
      cvv: '',
      atmPin: '',
      registeredMobileNumber: '',
      mobileAppLoginPin: '',
      mobileBankingPin: '',
      netBankingUserId: '',
      netBankingPassword: '',
    });
    setErrors({});
    resetVisibility();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Account Holder Name
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    // Bank Account Number
    if (formData.bankAccountNumber && !validateAccountNumber(formData.bankAccountNumber)) {
      newErrors.bankAccountNumber = 'Invalid account number (9-18 digits)';
    }

    // IFSC Code
    if (formData.ifscCode && !validateIFSC(formData.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }

    // Debit Card Number
    if (formData.debitCardNumber && !validateCardNumber(formData.debitCardNumber)) {
      newErrors.debitCardNumber = 'Invalid card number (16 digits)';
    }

    // Card Expiry
    if (formData.cardExpiryDate && !validateExpiryDate(formData.cardExpiryDate)) {
      newErrors.cardExpiryDate = 'Invalid or expired date';
    }

    // CVV
    if (formData.cvv && !validateCVV(formData.cvv)) {
      newErrors.cvv = 'CVV must be 3 digits';
    }

    // ATM PIN
    if (formData.atmPin && !validatePIN(formData.atmPin)) {
      newErrors.atmPin = 'PIN must be 4-6 digits';
    }

    // Mobile App Login PIN
    if (formData.mobileAppLoginPin && !validatePIN(formData.mobileAppLoginPin)) {
      newErrors.mobileAppLoginPin = 'PIN must be 4-6 digits';
    }

    // Mobile Banking PIN
    if (formData.mobileBankingPin && !validatePIN(formData.mobileBankingPin)) {
      newErrors.mobileBankingPin = 'PIN must be 4-6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      const bankId = currentBankId || crypto.randomUUID();
      const bankRef = doc(db, 'users', user.uid, 'bankDetails', bankId);

      // Encrypt sensitive data before saving
      const encryptedData = {
        accountHolderName: formData.accountHolderName.trim(),
        bankName: formData.bankName.trim(),
        customerId: formData.customerId.trim(),
        bankAccountNumber: encryptData(formData.bankAccountNumber.replace(/\s/g, ''), user.uid),
        ifscCode: formData.ifscCode.toUpperCase().trim(),
        debitCardNumber: encryptData(formData.debitCardNumber.replace(/\s/g, ''), user.uid),
        cardExpiryDate: formData.cardExpiryDate,
        cvv: encryptData(formData.cvv, user.uid),
        atmPin: encryptData(formData.atmPin, user.uid),
        registeredMobileNumber: encryptData(formData.registeredMobileNumber.replace(/\s/g, ''), user.uid),
        mobileAppLoginPin: encryptData(formData.mobileAppLoginPin, user.uid),
        mobileBankingPin: encryptData(formData.mobileBankingPin, user.uid),
        netBankingUserId: encryptData(formData.netBankingUserId, user.uid),
        netBankingPassword: encryptData(formData.netBankingPassword, user.uid),
        updatedAt: serverTimestamp(),
        createdAt: currentBankId ? undefined : serverTimestamp(),
      };

      await setDoc(bankRef, encryptedData, { merge: true });

      toast.success(currentBankId ? 'Bank details updated' : 'Bank details added');
      await loadAllBankDetails();
      setViewMode('list');
      setCurrentBankId(null);
      resetForm();
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast.error('Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !bankToDelete) return;

    try {
      const bankRef = doc(db, 'users', user.uid, 'bankDetails', bankToDelete);
      await deleteDoc(bankRef);
      
      toast.success('Bank details deleted');
      await loadAllBankDetails();
      setDeleteDialogOpen(false);
      setBankToDelete(null);
      
      if (currentBankId === bankToDelete) {
        setViewMode('list');
        setCurrentBankId(null);
      }
    } catch (error) {
      console.error('Error deleting bank details:', error);
      toast.error('Failed to delete bank details');
    }
  };

  const handleViewBank = async (bankId: string) => {
    setCurrentBankId(bankId);
    await loadSingleBankDetails(bankId);
    setViewMode('view');
  };

  const handleEditBank = async (bankId: string) => {
    setCurrentBankId(bankId);
    await loadSingleBankDetails(bankId);
    setViewMode('edit');
  };

  const handleAddNew = () => {
    resetForm();
    setCurrentBankId(null);
    setViewMode('add');
  };

  const handleBack = () => {
    setViewMode('list');
    setCurrentBankId(null);
    resetForm();
  };

  const toggleVisibility = (field: keyof FieldVisibility) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) {
      toast.error(`No ${label} to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied successfully');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShareBankDetails = async () => {
    const shareText = `Bank Details:
━━━━━━━━━━━━━━━━━━
Bank Name: ${formData.bankName || '-'}
Account Holder: ${formData.accountHolderName || '-'}
Account Number: ${formData.bankAccountNumber || '-'}
IFSC Code: ${formData.ifscCode || '-'}
Customer ID: ${formData.customerId || '-'}
━━━━━━━━━━━━━━━━━━`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bank Details',
          text: shareText,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Fallback to clipboard
          await copyToClipboard(shareText, 'Bank details');
        }
      }
    } else {
      // Fallback to clipboard
      await copyToClipboard(shareText, 'Bank details');
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    let processedValue = value;

    // Format specific fields
    if (field === 'debitCardNumber') {
      processedValue = formatCardNumber(value);
    } else if (field === 'cardExpiryDate') {
      processedValue = formatExpiryDate(value);
    } else if (field === 'ifscCode') {
      processedValue = value.toUpperCase();
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderSecureInput = (
    field: keyof typeof formData,
    label: string,
    placeholder: string,
    isSecret: boolean = false,
    maxLength?: number,
    inputMode?: 'text' | 'numeric'
  ) => {
    const isVisible = isSecret ? visibility[field as keyof FieldVisibility] : true;
    const error = errors[field];
    const isEditable = viewMode === 'edit' || viewMode === 'add';
    const hasValue = formData[field].trim().length > 0;

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="flex items-center gap-2">
          {label}
          {isSecret && <Lock className="h-3 w-3 text-muted-foreground" />}
        </Label>
        <div className="relative flex items-center gap-1">
          <div className="relative flex-1">
            <Input
              id={field}
              type={isSecret && !isVisible ? 'password' : 'text'}
              value={formData[field]}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
              inputMode={inputMode}
              className={cn(
                isSecret && 'pr-10',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
              disabled={!isEditable}
            />
            {isSecret && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => toggleVisibility(field as keyof FieldVisibility)}
              >
                {isVisible ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => copyToClipboard(formData[field], label)}
            disabled={!hasValue}
            title={`Copy ${label}`}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderListView = () => {
    if (bankDetailsList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="font-medium text-lg mb-2">No Bank Details Yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Add your bank account, card, and net banking information securely.
          </p>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Bank Details
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {bankDetailsList.length} bank account{bankDetailsList.length !== 1 ? 's' : ''} saved
          </p>
          <Button onClick={handleAddNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>

        <div className="space-y-3">
          {bankDetailsList.map((bank) => (
            <Card 
              key={bank.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleViewBank(bank.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{bank.bankName || bank.accountHolderName || 'Unnamed Account'}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {bank.bankAccountNumberMasked}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bank.ifscCode && (
                      <Badge variant="secondary" className="hidden sm:flex">
                        {bank.ifscCode}
                      </Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderViewModeContent = () => {
    const bank = bankDetailsList.find(b => b.id === currentBankId);
    if (!bank) return null;

    const CopyButton = ({ value, label }: { value: string; label: string }) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(value, label);
        }}
        disabled={!value}
      >
        <Copy className="h-3 w-3" />
      </Button>
    );

    const scrollToBottom = () => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      }
    };

    return (
      <div className="space-y-6">
        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleEditBank(currentBankId!)}
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
            Scroll Down
          </Button>
        </div>

        {/* Bank Information */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Bank Information
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleShareBankDetails}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Bank Name</p>
                <div className="flex items-center gap-1">
                  <p className="font-medium flex-1">{bank.bankName || '-'}</p>
                  <CopyButton value={bank.bankName} label="Bank name" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer ID</p>
                <div className="flex items-center gap-1">
                  <p className="font-medium flex-1">{bank.customerId || '-'}</p>
                  <CopyButton value={bank.customerId} label="Customer ID" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Account Holder</p>
              <div className="flex items-center gap-1">
                <p className="font-medium flex-1">{bank.accountHolderName || '-'}</p>
                <CopyButton value={bank.accountHolderName} label="Account holder name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Account Number</p>
                <div className="flex items-center gap-1">
                  <p className="font-medium font-mono flex-1">{bank.bankAccountNumberMasked}</p>
                  <CopyButton value={formData.bankAccountNumber} label="Account number" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IFSC Code</p>
                <div className="flex items-center gap-1">
                  <p className="font-medium flex-1">{bank.ifscCode || '-'}</p>
                  <CopyButton value={bank.ifscCode} label="IFSC code" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debit Card Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Debit Card Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Debit Card Number</p>
              <div className="flex items-center gap-1">
                <p className="font-medium font-mono flex-1">{bank.debitCardNumberMasked}</p>
                <CopyButton value={formData.debitCardNumber} label="Card number" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Card Expiry (MM/YY)</p>
                <div className="flex items-center gap-1">
                  <Badge variant={bank.cardExpiryDate ? 'default' : 'secondary'} className="mt-1">
                    {bank.cardExpiryDate ? <Check className="h-3 w-3 mr-1" /> : null}
                    {bank.cardExpiryDate ? 'Saved' : 'Not Set'}
                  </Badge>
                  {bank.cardExpiryDate && <CopyButton value={bank.cardExpiryDate} label="Expiry date" />}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CVV</p>
                <div className="flex items-center gap-1">
                  <Badge variant={bank.hasCvv ? 'default' : 'secondary'} className="mt-1">
                    {bank.hasCvv ? <Check className="h-3 w-3 mr-1" /> : null}
                    {bank.hasCvv ? 'Saved' : 'Not Set'}
                  </Badge>
                  {bank.hasCvv && <CopyButton value={formData.cvv} label="CVV" />}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ATM PIN</p>
                <div className="flex items-center gap-1">
                  <Badge variant={bank.hasAtmPin ? 'default' : 'secondary'} className="mt-1">
                    {bank.hasAtmPin ? <Check className="h-3 w-3 mr-1" /> : null}
                    {bank.hasAtmPin ? 'Saved' : 'Not Set'}
                  </Badge>
                  {bank.hasAtmPin && <CopyButton value={formData.atmPin} label="ATM PIN" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile & App Banking Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Mobile & App Banking Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Registered Mobile Number</p>
                <div className="flex items-center gap-1">
                  <Badge variant={bank.hasRegisteredMobileNumber ? 'default' : 'secondary'} className="mt-1">
                    {bank.hasRegisteredMobileNumber ? <Check className="h-3 w-3 mr-1" /> : null}
                    {bank.hasRegisteredMobileNumber ? 'Saved' : 'Not Set'}
                  </Badge>
                  {bank.hasRegisteredMobileNumber && <CopyButton value={formData.registeredMobileNumber} label="Registered Mobile Number" />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Mobile App Login PIN</p>
                  <div className="flex items-center gap-1">
                    <Badge variant={bank.hasMobileAppLoginPin ? 'default' : 'secondary'} className="mt-1">
                      {bank.hasMobileAppLoginPin ? <Check className="h-3 w-3 mr-1" /> : null}
                      {bank.hasMobileAppLoginPin ? 'Saved' : 'Not Set'}
                    </Badge>
                    {bank.hasMobileAppLoginPin && <CopyButton value={formData.mobileAppLoginPin} label="Mobile App Login PIN" />}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mobile Banking PIN</p>
                  <div className="flex items-center gap-1">
                    <Badge variant={bank.hasMobileBankingPin ? 'default' : 'secondary'} className="mt-1">
                      {bank.hasMobileBankingPin ? <Check className="h-3 w-3 mr-1" /> : null}
                      {bank.hasMobileBankingPin ? 'Saved' : 'Not Set'}
                    </Badge>
                    {bank.hasMobileBankingPin && <CopyButton value={formData.mobileBankingPin} label="Mobile Banking PIN" />}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Banking Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Net Banking Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Net Banking User ID</p>
                <div className="flex items-center gap-1">
                  <Badge variant={bank.hasNetBankingUserId ? 'default' : 'secondary'} className="mt-1">
                    {bank.hasNetBankingUserId ? <Check className="h-3 w-3 mr-1" /> : null}
                    {bank.hasNetBankingUserId ? 'Saved' : 'Not Set'}
                  </Badge>
                  {bank.hasNetBankingUserId && <CopyButton value={formData.netBankingUserId} label="Net Banking User ID" />}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Banking Password</p>
                <div className="flex items-center gap-1">
                  <Badge variant={bank.hasNetBankingPassword ? 'default' : 'secondary'} className="mt-1">
                    {bank.hasNetBankingPassword ? <Check className="h-3 w-3 mr-1" /> : null}
                    {bank.hasNetBankingPassword ? 'Saved' : 'Not Set'}
                  </Badge>
                  {bank.hasNetBankingPassword && <CopyButton value={formData.netBankingPassword} label="Net Banking Password" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={() => {
              setBankToDelete(currentBankId);
              setDeleteDialogOpen(true);
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button 
            onClick={() => handleEditBank(currentBankId!)} 
            className="flex-1 gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Details
          </Button>
        </div>
      </div>
    );
  };

  const renderEditMode = () => {
    return (
      <div className="space-y-6">
        {/* Bank Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Bank Information
            </CardTitle>
            <CardDescription>Basic bank account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderSecureInput('bankName', 'Bank Name', 'e.g., State Bank of India')}
            {renderSecureInput('accountHolderName', 'Account Holder Name', 'Enter full name as per bank records')}
            {renderSecureInput('customerId', 'Customer ID', 'Enter your customer ID')}
            {renderSecureInput('bankAccountNumber', 'Bank Account Number', 'Enter account number', true, 18, 'numeric')}
            {renderSecureInput('ifscCode', 'IFSC Code', 'e.g., SBIN0001234', false, 11)}
          </CardContent>
        </Card>

        {/* Debit Card Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Debit Card Details
            </CardTitle>
            <CardDescription>Your debit card information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderSecureInput('debitCardNumber', 'Debit Card Number', '0000 0000 0000 0000', true, 19, 'numeric')}
            <div className="grid grid-cols-2 gap-4">
              {renderSecureInput('cardExpiryDate', 'Card Expiry Date (MM/YY)', 'MM/YY', true, 5)}
              {renderSecureInput('cvv', 'CVV', '***', true, 3, 'numeric')}
            </div>
            {renderSecureInput('atmPin', 'ATM PIN', '****', true, 6, 'numeric')}
          </CardContent>
        </Card>

        {/* Mobile & App Banking Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Mobile & App Banking Details
            </CardTitle>
            <CardDescription>Mobile banking credentials and registered number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderSecureInput('registeredMobileNumber', 'Registered Mobile Number', 'Enter mobile number linked to bank', true, 15, 'numeric')}
            {renderSecureInput('mobileAppLoginPin', 'Mobile App Login PIN', '****', true, 6, 'numeric')}
            {renderSecureInput('mobileBankingPin', 'Mobile Banking PIN', '****', true, 6, 'numeric')}
          </CardContent>
        </Card>

        {/* Net Banking Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Net Banking Details
            </CardTitle>
            <CardDescription>Internet banking login credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderSecureInput('netBankingUserId', 'Net Banking User ID', 'Enter your user ID', true)}
            {renderSecureInput('netBankingPassword', 'Net Banking Password', 'Enter your password', true)}
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-primary">Security Note</p>
            <ul className="text-muted-foreground mt-1 space-y-1">
              <li className="flex items-center gap-2">
                <Lock className="h-3 w-3" />
                All data is encrypted before storage
              </li>
              <li className="flex items-center gap-2">
                <Copy className="h-3 w-3" />
                Copy action requires user confirmation
              </li>
              <li className="flex items-center gap-2">
                <EyeOff className="h-3 w-3" />
                Sensitive data is hidden by default
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 gap-2"
            disabled={saving}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 gap-2"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  };

  const getDialogTitle = () => {
    switch (viewMode) {
      case 'add':
        return 'Add Bank Details';
      case 'edit':
        return 'Edit Bank Details';
      case 'view':
        return 'Bank Details';
      default:
        return 'Bank Details';
    }
  };

  const getDialogDescription = () => {
    switch (viewMode) {
      case 'add':
        return 'Enter your bank information securely';
      case 'edit':
        return 'Update your bank information';
      case 'view':
        return 'View your saved bank information';
      default:
        return 'Manage your bank accounts and cards';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
            <div className="flex items-center gap-2">
              {viewMode !== 'list' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {getDialogTitle()}
                </DialogTitle>
                <DialogDescription>
                  {getDialogDescription()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : viewMode === 'list' ? (
              renderListView()
            ) : viewMode === 'view' ? (
              renderViewModeContent()
            ) : (
              renderEditMode()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Details?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bank account details from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBankToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
