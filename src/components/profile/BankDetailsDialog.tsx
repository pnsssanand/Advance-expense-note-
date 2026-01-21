import { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { MaskedBankDetails, MaskedCreditCardDetails } from '@/types/expense';
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
  MessageCircle,
  Mail,
  Send,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PinDialog } from '@/components/savings/PinDialog';
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

interface CreditCardFormErrors {
  cardName?: string;
  cardHolderName?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  pin?: string;
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

interface CreditCardVisibility {
  cardNumber: boolean;
  cvv: boolean;
  pin: boolean;
}

interface BankDetailsPinData {
  pin?: string;
  pinSet: boolean;
}

type ViewMode = 'list' | 'view' | 'edit' | 'add' | 'select-type' | 'add-card' | 'view-card' | 'edit-card';
type DetailType = 'bank' | 'card';

export function BankDetailsDialog({ open, onOpenChange }: BankDetailsDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankDetailsList, setBankDetailsList] = useState<MaskedBankDetails[]>([]);
  const [creditCardList, setCreditCardList] = useState<MaskedCreditCardDetails[]>([]);
  const [currentBankId, setCurrentBankId] = useState<string | null>(null);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // PIN Authentication state
  const [authenticated, setAuthenticated] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'verify'>('verify');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinData, setPinData] = useState<BankDetailsPinData>({ pinSet: false });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

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

  // Credit Card Form state
  const [cardFormData, setCardFormData] = useState({
    cardName: '',
    cardHolderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    pin: '',
    dueDate: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [cardErrors, setCardErrors] = useState<CreditCardFormErrors>({});
  
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

  const [cardVisibility, setCardVisibility] = useState<CreditCardVisibility>({
    cardNumber: false,
    cvv: false,
    pin: false,
  });

  // Load PIN data and check authentication
  useEffect(() => {
    if (open && user) {
      loadPinData();
    }
  }, [open, user]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setViewMode('list');
      setCurrentBankId(null);
      setCurrentCardId(null);
      setErrors({});
      setCardErrors({});
      resetVisibility();
      resetCardVisibility();
      setAuthenticated(false);
      setShowPinDialog(false);
    }
  }, [open]);

  const loadPinData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const pinRef = doc(db, 'users', user.uid, 'bankDetailsPin', 'data');
      const pinSnap = await getDoc(pinRef);
      
      if (pinSnap.exists()) {
        const data = pinSnap.data();
        setPinData({
          pin: data.pin,
          pinSet: data.pinSet || false,
        });
        
        // PIN is set, show verify dialog
        setPinMode('verify');
        setShowPinDialog(true);
      } else {
        // First time - no PIN set
        setPinData({ pinSet: false });
        setPinMode('set');
        setShowPinDialog(true);
      }
    } catch (error) {
      console.error('Error loading PIN data:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  // Simple hash function for PIN
  const hashPin = (pin: string): string => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const handlePinSubmit = async (pin: string): Promise<boolean> => {
    if (!user) return false;
    
    setPinLoading(true);
    try {
      if (pinMode === 'set') {
        // Set new PIN
        const hashedPin = hashPin(pin);
        const pinRef = doc(db, 'users', user.uid, 'bankDetailsPin', 'data');
        
        await setDoc(pinRef, {
          pin: hashedPin,
          pinSet: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });
        
        setPinData({
          pin: hashedPin,
          pinSet: true,
        });
        
        setAuthenticated(true);
        setShowPinDialog(false);
        loadAllBankDetails();
        loadAllCreditCards();
        toast.success('Bank Details PIN set successfully!');
        return true;
      } else {
        // Verify PIN
        const hashedPin = hashPin(pin);
        
        if (hashedPin === pinData.pin) {
          setAuthenticated(true);
          setShowPinDialog(false);
          loadAllBankDetails();
          loadAllCreditCards();
          toast.success('Access granted!');
          return true;
        } else {
          return false;
        }
      }
    } catch (error) {
      console.error('PIN error:', error);
      toast.error('An error occurred. Please try again.');
      return false;
    } finally {
      setPinLoading(false);
    }
  };

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

  const resetCardVisibility = () => {
    setCardVisibility({
      cardNumber: false,
      cvv: false,
      pin: false,
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

  // Credit Card functions
  const loadAllCreditCards = async () => {
    if (!user) return;

    try {
      const cardsRef = collection(db, 'users', user.uid, 'creditCardDetails');
      const cardsSnap = await getDocs(cardsRef);
      
      const cards: MaskedCreditCardDetails[] = [];
      
      for (const docSnap of cardsSnap.docs) {
        const data = docSnap.data();
        const decryptedCardNumber = decryptData(data.cardNumber || '', user.uid);
        
        cards.push({
          id: docSnap.id,
          cardName: data.cardName || '',
          cardHolderName: data.cardHolderName || '',
          cardNumberMasked: maskCardNumber(decryptedCardNumber),
          expiryDate: data.expiryDate || '',
          hasCvv: !!data.cvv,
          hasPin: !!data.pin,
          dueDate: data.dueDate || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      }
      
      // Sort by creation date (newest first)
      cards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setCreditCardList(cards);
    } catch (error) {
      console.error('Error loading credit cards:', error);
    }
  };

  const loadSingleCreditCard = async (cardId: string) => {
    if (!user) return;

    try {
      const cardRef = doc(db, 'users', user.uid, 'creditCardDetails', cardId);
      const cardSnap = await getDoc(cardRef);

      if (cardSnap.exists()) {
        const data = cardSnap.data();
        
        setCardFormData({
          cardName: data.cardName || '',
          cardHolderName: data.cardHolderName || '',
          cardNumber: decryptData(data.cardNumber || '', user.uid),
          expiryDate: data.expiryDate || '',
          cvv: decryptData(data.cvv || '', user.uid),
          pin: decryptData(data.pin || '', user.uid),
          dueDate: data.dueDate?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error loading credit card:', error);
      toast.error('Failed to load credit card details');
    }
  };

  const resetCardForm = () => {
    setCardFormData({
      cardName: '',
      cardHolderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      pin: '',
      dueDate: '',
    });
    setCardErrors({});
    resetCardVisibility();
  };

  const validateCardForm = (): boolean => {
    const newErrors: CreditCardFormErrors = {};

    if (!cardFormData.cardName.trim()) {
      newErrors.cardName = 'Card name is required';
    }

    if (!cardFormData.cardHolderName.trim()) {
      newErrors.cardHolderName = 'Card holder name is required';
    }

    if (cardFormData.cardNumber && !validateCardNumber(cardFormData.cardNumber)) {
      newErrors.cardNumber = 'Invalid card number (16 digits)';
    }

    if (cardFormData.expiryDate && !validateExpiryDate(cardFormData.expiryDate)) {
      newErrors.expiryDate = 'Invalid or expired date';
    }

    if (cardFormData.cvv && !validateCVV(cardFormData.cvv)) {
      newErrors.cvv = 'CVV must be 3 digits';
    }

    if (cardFormData.pin && !validatePIN(cardFormData.pin)) {
      newErrors.pin = 'PIN must be 4-6 digits';
    }

    setCardErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveCard = async () => {
    if (!user) return;

    if (!validateCardForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      const cardId = currentCardId || crypto.randomUUID();
      const cardRef = doc(db, 'users', user.uid, 'creditCardDetails', cardId);

      const encryptedData: Record<string, any> = {
        cardName: cardFormData.cardName.trim(),
        cardHolderName: cardFormData.cardHolderName.trim(),
        cardNumber: encryptData(cardFormData.cardNumber.replace(/\s/g, ''), user.uid),
        expiryDate: cardFormData.expiryDate,
        cvv: encryptData(cardFormData.cvv, user.uid),
        pin: encryptData(cardFormData.pin, user.uid),
        dueDate: cardFormData.dueDate ? parseInt(cardFormData.dueDate) : null,
        updatedAt: serverTimestamp(),
      };

      if (!currentCardId) {
        encryptedData.createdAt = serverTimestamp();
      }

      await setDoc(cardRef, encryptedData, { merge: true });

      toast.success(currentCardId ? 'Credit card updated' : 'Credit card added');
      await loadAllCreditCards();
      setViewMode('list');
      setCurrentCardId(null);
      resetCardForm();
    } catch (error) {
      console.error('Error saving credit card:', error);
      toast.error('Failed to save credit card');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!user || !cardToDelete) return;

    try {
      const cardRef = doc(db, 'users', user.uid, 'creditCardDetails', cardToDelete);
      await deleteDoc(cardRef);
      
      toast.success('Credit card deleted');
      await loadAllCreditCards();
      setDeleteDialogOpen(false);
      setCardToDelete(null);
      
      if (currentCardId === cardToDelete) {
        setViewMode('list');
        setCurrentCardId(null);
      }
    } catch (error) {
      console.error('Error deleting credit card:', error);
      toast.error('Failed to delete credit card');
    }
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
      const encryptedData: Record<string, any> = {
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
      };

      // Only add createdAt for new entries
      if (!currentBankId) {
        encryptedData.createdAt = serverTimestamp();
      }

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

  // Helper function to get ordinal suffix for day of month
  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
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

  const handleViewCard = async (cardId: string) => {
    setCurrentCardId(cardId);
    await loadSingleCreditCard(cardId);
    setViewMode('view-card');
  };

  const handleEditCard = async (cardId: string) => {
    setCurrentCardId(cardId);
    await loadSingleCreditCard(cardId);
    setViewMode('edit-card');
  };

  const handleAddNew = () => {
    // Show selection dialog
    setViewMode('select-type');
  };

  const handleSelectType = (type: DetailType) => {
    if (type === 'bank') {
      resetForm();
      setCurrentBankId(null);
      setViewMode('add');
    } else {
      resetCardForm();
      setCurrentCardId(null);
      setViewMode('add-card');
    }
  };

  const handleBack = () => {
    if (viewMode === 'select-type') {
      setViewMode('list');
    } else if (viewMode === 'add-card' || viewMode === 'view-card' || viewMode === 'edit-card') {
      setViewMode('list');
      setCurrentCardId(null);
      resetCardForm();
    } else {
      setViewMode('list');
      setCurrentBankId(null);
      resetForm();
    }
  };

  const toggleVisibility = (field: keyof FieldVisibility) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleCardVisibility = (field: keyof CreditCardVisibility) => {
    setCardVisibility(prev => ({ ...prev, [field]: !prev[field] }));
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

  const getBankDetailsShareText = () => {
    return `Bank Details:
━━━━━━━━━━━━━━━━━━
Bank Name: ${formData.bankName || '-'}
Account Holder: ${formData.accountHolderName || '-'}
Account Number: ${formData.bankAccountNumber || '-'}
IFSC Code: ${formData.ifscCode || '-'}
Customer ID: ${formData.customerId || '-'}
━━━━━━━━━━━━━━━━━━`;
  };

  const handleCopyBankDetails = async () => {
    const shareText = getBankDetailsShareText();
    await copyToClipboard(shareText, 'Bank details');
  };

  const handleShareWhatsApp = () => {
    const shareText = getBankDetailsShareText();
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleShareTelegram = () => {
    const shareText = getBankDetailsShareText();
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?text=${encodedText}`, '_blank');
  };

  const handleShareEmail = () => {
    const shareText = getBankDetailsShareText();
    const subject = encodeURIComponent('Bank Details');
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleNativeShare = async () => {
    const shareText = getBankDetailsShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bank Details',
          text: shareText,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          await copyToClipboard(shareText, 'Bank details');
        }
      }
    } else {
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

  const renderSelectTypeView = () => {
    return (
      <div className="space-y-6 py-4">
        <p className="text-center text-muted-foreground">
          What would you like to add?
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary"
            onClick={() => handleSelectType('bank')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold">Bank Account</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add bank details, debit card & net banking info
                </p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary"
            onClick={() => handleSelectType('card')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold">Credit Card</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Store credit card details securely
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const totalItems = bankDetailsList.length + creditCardList.length;
    
    if (totalItems === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="font-medium text-lg mb-2">No Bank Details Yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Add your bank account, credit card, and net banking information securely.
          </p>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? 's' : ''} saved
          </p>
          <Button onClick={handleAddNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>

        {/* Bank Accounts Section */}
        {bankDetailsList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium">Bank Accounts ({bankDetailsList.length})</p>
            </div>
            {bankDetailsList.map((bank) => (
              <Card 
                key={bank.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleViewBank(bank.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
        )}

        {/* Credit Cards Section */}
        {creditCardList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-medium">Credit Cards ({creditCardList.length})</p>
            </div>
            {creditCardList.map((card) => (
              <Card 
                key={card.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleViewCard(card.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">{card.cardName || 'Unnamed Card'}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {card.cardNumberMasked}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {card.expiryDate && (
                          <Badge variant="secondary" className="hidden sm:flex">
                            Exp: {card.expiryDate}
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {card.dueDate && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {card.dueDate}{getOrdinalSuffix(card.dueDate)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleCopyBankDetails}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleShareWhatsApp} className="gap-2 cursor-pointer">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareTelegram} className="gap-2 cursor-pointer">
                      <Send className="h-4 w-4 text-blue-500" />
                      Telegram
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareEmail} className="gap-2 cursor-pointer">
                      <Mail className="h-4 w-4 text-red-500" />
                      Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleNativeShare} className="gap-2 cursor-pointer">
                      <Share2 className="h-4 w-4" />
                      More Options...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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

  const renderCreditCardViewMode = () => {
    const card = creditCardList.find(c => c.id === currentCardId);
    if (!card) return null;

    return (
      <div className="space-y-6">
        {/* Card Information */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                Credit Card Details
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Card Name</p>
                <p className="font-medium">{card.cardName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Card Holder</p>
                <p className="font-medium">{card.cardHolderName || '-'}</p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground">Card Number</p>
              <div className="flex items-center gap-2">
                <p className="font-medium font-mono flex-1">
                  {cardVisibility.cardNumber ? cardFormData.cardNumber : card.cardNumberMasked}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleCardVisibility('cardNumber')}
                >
                  {cardVisibility.cardNumber ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(cardFormData.cardNumber, 'Card number')}
                  disabled={!cardFormData.cardNumber}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Expiry Date</p>
                <p className="font-medium">{card.expiryDate || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bill Due Date</p>
                <div className="flex items-center gap-1">
                  {card.dueDate ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {card.dueDate}{getOrdinalSuffix(card.dueDate)} of every month
                    </Badge>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">CVV</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium font-mono flex-1">
                    {card.hasCvv ? (cardVisibility.cvv ? cardFormData.cvv : '***') : '-'}
                  </p>
                  {card.hasCvv && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleCardVisibility('cvv')}
                      >
                        {cardVisibility.cvv ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(cardFormData.cvv, 'CVV')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PIN</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium font-mono flex-1">
                    {card.hasPin ? (cardVisibility.pin ? cardFormData.pin : '****') : '-'}
                  </p>
                  {card.hasPin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleCardVisibility('pin')}
                      >
                        {cardVisibility.pin ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(cardFormData.pin, 'PIN')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-primary">Security Note</p>
            <p className="text-muted-foreground mt-1">
              All card details are encrypted. Use the eye icon to reveal sensitive information.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={() => {
              setCardToDelete(currentCardId);
              setDeleteDialogOpen(true);
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button 
            onClick={() => handleEditCard(currentCardId!)} 
            className="flex-1 gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Details
          </Button>
        </div>
      </div>
    );
  };

  const renderCreditCardEditMode = () => {
    const handleCardInputChange = (field: keyof typeof cardFormData, value: string) => {
      let processedValue = value;

      if (field === 'cardNumber') {
        processedValue = formatCardNumber(value);
      } else if (field === 'expiryDate') {
        processedValue = formatExpiryDate(value);
      }

      setCardFormData(prev => ({ ...prev, [field]: processedValue }));

      if (cardErrors[field]) {
        setCardErrors(prev => ({ ...prev, [field]: undefined }));
      }
    };

    const renderCardInput = (
      field: keyof typeof cardFormData,
      label: string,
      placeholder: string,
      isSecret: boolean = false,
      maxLength?: number,
      inputMode?: 'text' | 'numeric'
    ) => {
      const isVisible = isSecret ? cardVisibility[field as keyof CreditCardVisibility] : true;
      const error = cardErrors[field];
      const hasValue = cardFormData[field].trim().length > 0;

      return (
        <div className="space-y-2">
          <Label htmlFor={`card-${field}`} className="flex items-center gap-2">
            {label}
            {isSecret && <Lock className="h-3 w-3 text-muted-foreground" />}
          </Label>
          <div className="relative flex items-center gap-1">
            <div className="relative flex-1">
              <Input
                id={`card-${field}`}
                type={isSecret && !isVisible ? 'password' : 'text'}
                value={cardFormData[field]}
                onChange={(e) => handleCardInputChange(field, e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                inputMode={inputMode}
                className={cn(
                  isSecret && 'pr-10',
                  error && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {isSecret && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => toggleCardVisibility(field as keyof CreditCardVisibility)}
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
              onClick={() => copyToClipboard(cardFormData[field], label)}
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

    return (
      <div className="space-y-6">
        {/* Card Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              Credit Card Details
            </CardTitle>
            <CardDescription>Enter your credit card information securely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderCardInput('cardName', 'Card Name', 'e.g., HDFC Millennia, ICICI Amazon Pay')}
            {renderCardInput('cardHolderName', 'Card Holder Name', 'Enter name as on card')}
            {renderCardInput('cardNumber', 'Card Number', '0000 0000 0000 0000', true, 19, 'numeric')}
            <div className="grid grid-cols-2 gap-4">
              {renderCardInput('expiryDate', 'Expiry Date (MM/YY)', 'MM/YY', true, 5)}
              {renderCardInput('cvv', 'CVV', '***', true, 3, 'numeric')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderCardInput('pin', 'Card PIN', '****', true, 6, 'numeric')}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  Bill Due Date
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="relative">
                  <Input
                    id="dueDate"
                    type="number"
                    min="1"
                    max="31"
                    value={cardFormData.dueDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      const num = parseInt(value);
                      if (value === '' || (num >= 1 && num <= 31)) {
                        setCardFormData(prev => ({ ...prev, dueDate: value }));
                      }
                    }}
                    placeholder="1-31"
                    inputMode="numeric"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Day of month when bill is due
                </p>
              </div>
            </div>
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
            onClick={handleSaveCard}
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
      case 'select-type':
        return 'Add New';
      case 'add-card':
        return 'Add Credit Card';
      case 'edit-card':
        return 'Edit Credit Card';
      case 'view-card':
        return 'Credit Card Details';
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
      case 'select-type':
        return 'Choose what you want to add';
      case 'add-card':
        return 'Enter your credit card information securely';
      case 'edit-card':
        return 'Update your credit card information';
      case 'view-card':
        return 'View your saved credit card information';
      default:
        return 'Manage your bank accounts and cards';
    }
  };

  const getDialogIcon = () => {
    if (viewMode === 'add-card' || viewMode === 'edit-card' || viewMode === 'view-card') {
      return <CreditCard className="h-5 w-5 text-purple-600" />;
    }
    return <Building2 className="h-5 w-5 text-primary" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
            <div className="flex items-center gap-2">
              {authenticated && viewMode !== 'list' && (
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
                  {authenticated ? getDialogIcon() : <ShieldCheck className="h-5 w-5 text-primary" />}
                  {authenticated ? getDialogTitle() : 'Bank Details'}
                </DialogTitle>
                <DialogDescription>
                  {authenticated ? getDialogDescription() : 'Secure access to your bank details'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !authenticated ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Lock className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-medium text-lg mb-2">PIN Protected</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  {pinData.pinSet 
                    ? 'Enter your PIN to access bank details. This keeps your sensitive information secure.'
                    : 'Set up a 4-digit PIN to secure your bank details. You\'ll need this PIN every time you want to view them.'}
                </p>
                <Button 
                  onClick={() => setShowPinDialog(true)}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {pinData.pinSet ? 'Enter PIN' : 'Set Up PIN'}
                </Button>
              </div>
            ) : viewMode === 'list' ? (
              renderListView()
            ) : viewMode === 'select-type' ? (
              renderSelectTypeView()
            ) : viewMode === 'view' ? (
              renderViewModeContent()
            ) : viewMode === 'view-card' ? (
              renderCreditCardViewMode()
            ) : viewMode === 'add-card' || viewMode === 'edit-card' ? (
              renderCreditCardEditMode()
            ) : (
              renderEditMode()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Dialog */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        mode={pinMode}
        onPinSubmit={handlePinSubmit}
        loading={pinLoading}
        context="bankDetails"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cardToDelete ? 'Delete Credit Card?' : 'Delete Bank Details?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {cardToDelete ? 'credit card' : 'bank account'} details from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBankToDelete(null);
              setCardToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={cardToDelete ? handleDeleteCard : handleDelete}
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
