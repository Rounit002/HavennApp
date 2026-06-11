import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import Select from 'react-select';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { UserPlus } from 'lucide-react';

// Interface for a Branch
interface Branch {
  id: number;
  name: string;
}

// Interface for a Seat
interface Seat {
  id: number;
  seatNumber: string;
}

// Interface for a Schedule/Shift
interface Schedule {
  id: number;
  title: string;
  description?: string | null;
  time: string;
  eventDate: string;
  fee: number;
  isAssigned?: boolean;
}

// Interface for a Locker
interface Locker {
  id: number;
  lockerNumber: string;
  isAssigned: boolean;
}

// Interface for react-select options
interface ShiftOption {
  value: number;
  label: string;
  isDisabled: boolean;
}

// Interface for generic react-select options
interface SelectOption {
  value: number | null;
  label: string;
  isDisabled?: boolean;
}

// Interface for the form's state
interface FormData {
  name: string;
  registrationNumber?: string;
  fatherName?: string;
  aadharNumber?: string;
  email?: string;
  phone: string;
  address?: string;
  branchId: number | null;
  membershipStart: string;
  membershipEnd: string;
  createdAt: string; // Added createdAt field
  seatId: number | null;
  shiftIds: number[];
  lockerId: number | null;
  totalFee: string;
  cash: string;
  online: string;
  securityMoney: string;
  remark?: string;
  image: File | null;
  imageUrl: string | null;
  aadhaarFront: File | null;
  aadhaarFrontUrl: string | null;
  aadhaarBack: File | null;
  aadhaarBackUrl: string | null;
  discount: string;
  gender?: string;
}

const AddStudentForm: React.FC = () => {
  const navigate = useNavigate();
  // State for form data
  const [formData, setFormData] = useState<FormData>({
    name: '',
    registrationNumber: '',
    fatherName: '',
    aadharNumber: '',
    email: '',
    phone: '',
    address: '',
    branchId: null,
    membershipStart: new Date().toISOString().split('T')[0],
    membershipEnd: '',
    createdAt: new Date().toISOString().split('T')[0], // Set default to today
    seatId: null,
    shiftIds: [],
    lockerId: null,
    totalFee: '',
    cash: '',
    online: '',
    securityMoney: '',
    remark: '',
    image: null,
    imageUrl: null,
    aadhaarFront: null,
    aadhaarFrontUrl: null,
    aadhaarBack: null,
    aadhaarBackUrl: null,
    discount: '0',
    gender: 'male',
  });

  // State for data fetched from API
  const [branches, setBranches] = useState<Branch[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [shifts, setShifts] = useState<Schedule[]>([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState<number[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);

  // State for loading indicators and errors
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to fetch initial data (branches) when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const branchData = await api.getBranches();
        setBranches(branchData);
        setError(null);
      } catch (error: any) {
        console.error('Failed to fetch branches:', error);
        setError('You do not have permission to view branches. Contact an admin.');
        toast.error('Failed to load branches. Check your permissions.');
      }
    };
    fetchInitialData();
  }, []);


  // Effect to fetch seats and lockers when a branch is selected
  useEffect(() => {
    const fetchBranchSpecificData = async () => {
      if (formData.branchId !== null) {
        setLoadingSeats(true);
        setLoadingLockers(true);
        try {
          const seatsPromise = api.getSeats({ branchId: formData.branchId });
          const lockersPromise = api.getLockers(formData.branchId);
          const [seatsResponse, lockersResponse] = await Promise.all([seatsPromise, lockersPromise]);
          
          setSeats(seatsResponse.seats);
          setLockers(lockersResponse.lockers);
          setError(null);
        } catch (error) {
          console.error('Failed to fetch branch data:', error);
          setError('Failed to load seats and lockers for this branch. Check permissions.');
          toast.error('Failed to load seats and lockers.');
        } finally {
          setLoadingSeats(false);
          setLoadingLockers(false);
        }
      } else {
        setSeats([]);
        setLockers([]);
      }
    };
    fetchBranchSpecificData();
  }, [formData.branchId]);

  // Effect to fetch shifts for selected branch (shift-first flow)
  useEffect(() => {
    const fetchShifts = async () => {
      if (formData.branchId) {
        setLoadingShifts(true);
        try {
          const shiftsData = await api.getSchedules(formData.branchId);
          const formattedSchedules = shiftsData.schedules.map((schedule: any) => ({
            ...schedule,
            fee: schedule.fee ?? 0,
          }));
          setShifts(formattedSchedules);
          setError(null);
        } catch (error) {
          console.error('Failed to fetch shifts for branch:', error);
          setError('Failed to load shifts for the selected branch.');
          toast.error('Failed to load shifts.');
          setShifts([]);
        } finally {
          setLoadingShifts(false);
        }
      } else {
        setShifts([]);
      }
    };
    fetchShifts();
  }, [formData.branchId]);

  // Effect to fetch available seats for selected branch + shifts
  useEffect(() => {
    const fetchSeatsForShifts = async () => {
      if (formData.branchId && selectedShiftIds.length > 0) {
        setLoadingSeats(true);
        try {
          // Get seats that are available for ALL selected shifts
          const response = await api.getSeats({ branchId: formData.branchId });
          const allSeats: Seat[] = response.seats || [];
          
          const availableSeats = allSeats.filter((seat: any) => {
            // Check if seat is available for all selected shifts
            return selectedShiftIds.every(shiftId => {
              const shiftStatus = (seat.shifts || []).find((s: any) => s.shiftId === shiftId);
              return shiftStatus ? !shiftStatus.isAssigned : true;
            });
          });
          
          setSeats(availableSeats);
        } catch (err) {
          console.error('Failed to fetch seats for shifts:', err);
          setSeats([]);
        } finally {
          setLoadingSeats(false);
        }
      } else if (formData.branchId && selectedShiftIds.length === 0) {
        // If no shifts selected, show all available seats
        setLoadingSeats(true);
        try {
          const response = await api.getSeats({ branchId: formData.branchId });
          setSeats(response.seats || []);
        } catch (err) {
          console.error('Failed to fetch seats:', err);
          setSeats([]);
        } finally {
          setLoadingSeats(false);
        }
      }
    };
    fetchSeatsForShifts();
  }, [formData.branchId, selectedShiftIds]);

  // Handle changes to standard input fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes for select elements
  const handleNativeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes to react-select dropdowns (excluding shiftId which has its own handler)
  const handleSelectChange = (name: keyof FormData, option: SelectOption | ShiftOption | null) => {
    const value = option ? option.value : null;
    if (name === 'branchId') {
      // When branch changes, reset dependent fields and fetch shifts for the new branch
      setFormData(prev => ({
        ...prev,
        branchId: value,
        seatId: null,
        shiftIds: [],
        lockerId: null,
        totalFee: '',
      }));
      setSelectedShiftIds([]);
      
      // Shifts will be automatically updated by the useEffect that depends on branchId
    } else if (name === 'seatId') {
      setFormData(prev => ({
        ...prev,
        seatId: value,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle shift change (multiple select)
  const handleShiftChange = (options: readonly ShiftOption[]) => {
    const ids = options ? options.map(opt => opt.value) : [];
    setSelectedShiftIds(ids);
    setFormData(prev => ({ ...prev, shiftIds: ids }));
    // Reset seat when shifts change
    setFormData(prev => ({ ...prev, seatId: null }));
  };

  // Handle file input changes with validation
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
        toast.error('Only JPEG, JPG, PNG, and GIF images are allowed');
        return;
      }
      if (file.size > 200 * 1024) {
        toast.error('Image size exceeds 200KB limit');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleAadhaarFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
        toast.error('Only JPEG, JPG, PNG, and GIF images are allowed for Aadhaar front');
        return;
      }
      if (file.size > 200 * 1024) {
        toast.error('Aadhaar front image size exceeds 200KB limit');
        return;
      }
      setFormData(prev => ({ ...prev, aadhaarFront: file }));
    }
  };

  const handleAadhaarBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
        toast.error('Only JPEG, JPG, PNG, and GIF images are allowed for Aadhaar back');
        return;
      }
      if (file.size > 200 * 1024) {
        toast.error('Aadhaar back image size exceeds 200KB limit');
        return;
      }
      setFormData(prev => ({ ...prev, aadhaarBack: file }));
    }
  };

  // Prepare options for react-select components
  const branchOptions: SelectOption[] = branches.map(branch => ({
    value: branch.id,
    label: branch.name,
  }));

  const seatOptions: SelectOption[] = [
    { value: null, label: 'None', isDisabled: false },
    ...seats.map(seat => ({
      value: seat.id,
      label: seat.seatNumber,
      isDisabled: false,
    })),
  ];

  const lockerOptions: SelectOption[] = [
    { value: null, label: 'None', isDisabled: false },
    ...lockers.filter(locker => !locker.isAssigned).map(locker => ({
      value: locker.id,
      label: locker.lockerNumber,
      isDisabled: false,
    })),
  ];

  const shiftOptions: ShiftOption[] = shifts.map(shift => ({
    value: shift.id,
    label: `${shift.title} [Rs.${shift.fee}] ${shift.description ? `[${shift.description}]` : ''}`.trim(),
    isDisabled: false,
  }));

  // Auto-calculate total fee as sum of selected shifts' fees (if any selected)
  useEffect(() => {
    if (formData.shiftIds && formData.shiftIds.length > 0) {
      const sum = shifts
        .filter(s => formData.shiftIds.includes(s.id))
        .reduce((acc, s) => acc + (s.fee ?? 0), 0);
      setFormData(prev => ({ ...prev, totalFee: sum.toString() }));
    } else if (formData.totalFee && formData.totalFee !== '') {
      // If no shifts selected, leave totalFee as-is to allow manual entry
    } else {
      setFormData(prev => ({ ...prev, totalFee: '' }));
    }
  }, [formData.shiftIds, shifts]);

  // Handle form submission
  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.phone ||
      formData.branchId === null ||
      !formData.membershipStart ||
      !formData.membershipEnd ||
      formData.shiftIds.length === 0
    ) {
      toast.error('Please fill in all required fields (Name, Phone, Branch, Membership Start, Membership End, Shifts)');
      return;
    }

    try {
      // Upload images and get their URLs
      let imageUrl = formData.imageUrl || '';
      if (formData.image) {
        const imageFormData = new FormData();
        imageFormData.append('image', formData.image);
        const uploadResponse = await api.uploadImage(imageFormData);
        imageUrl = uploadResponse.imageUrl || '';
      }

      let aadhaarFrontUrl = formData.aadhaarFrontUrl || '';
      if (formData.aadhaarFront) {
        const frontFormData = new FormData();
        frontFormData.append('image', formData.aadhaarFront);
        const uploadResponse = await api.uploadImage(frontFormData);
        aadhaarFrontUrl = uploadResponse.imageUrl || '';
      }

      let aadhaarBackUrl = formData.aadhaarBackUrl || '';
      if (formData.aadhaarBack) {
        const backFormData = new FormData();
        backFormData.append('image', formData.aadhaarBack);
        const uploadResponse = await api.uploadImage(backFormData);
        aadhaarBackUrl = uploadResponse.imageUrl || '';
      }

      // Prepare student data for API submission
      const studentData = {
        name: formData.name,
        registrationNumber: formData.registrationNumber || undefined,
        fatherName: formData.fatherName || undefined,
        aadharNumber: formData.aadharNumber || undefined,
        email: formData.email || undefined,
        phone: formData.phone,
        address: formData.address?.trim() || undefined,
        branchId: formData.branchId!,
        membershipStart: formData.membershipStart,
        membershipEnd: formData.membershipEnd,
        createdAt: formData.createdAt, // Include the custom creation date
        totalFee: formData.totalFee ? parseFloat(formData.totalFee) : 0,
        amountPaid: (parseFloat(formData.cash) || 0) + (parseFloat(formData.online) || 0),
        cash: parseFloat(formData.cash) || 0,
        online: parseFloat(formData.online) || 0,
        securityMoney: parseFloat(formData.securityMoney) || 0,
        discount: parseFloat(formData.discount) || 0,
        remark: formData.remark || undefined,
        profileImageUrl: imageUrl || undefined,
        aadhaarFrontUrl: aadhaarFrontUrl || undefined,
        aadhaarBackUrl: aadhaarBackUrl || undefined,
        seatId: formData.seatId !== null ? formData.seatId : undefined,
        shiftIds: formData.shiftIds,
        lockerId: formData.lockerId !== null ? formData.lockerId : undefined,
        gender: formData.gender || undefined,
      };

      await api.addStudent(studentData);
      toast.success('Student added successfully');
      navigate('/students');
    } catch (error: any) {
      console.error('Failed to add student:', error);
      toast.error(error.message || 'Failed to add student');
    }
  };

  // Calculated values for display
  const cashAmount = parseFloat(formData.cash) || 0;
  const onlineAmount = parseFloat(formData.online) || 0;
  const totalAmountPaid = cashAmount + onlineAmount;
  const effectiveTotalFee = (parseFloat(formData.totalFee) || 0) - (parseFloat(formData.discount) || 0);
  const dueAmount = effectiveTotalFee - totalAmountPaid;

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-[#E1F5EE] to-[#0F6E56] text-white shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Add New Student</h1>
                  <p className="text-gray-500 text-sm">Create a new student profile and assign shifts, seats and lockers</p>
                </div>
              </div>
            </div>

            {/* Content Card */}
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="p-6">
                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
              required
            />
          </div>
        <div>
          <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Registration Number *
          </label>
          <input
            type="text"
            id="registrationNumber"
            name="registrationNumber"
            value={formData.registrationNumber || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700 mb-1">
            Father's Name
          </label>
          <input
            type="text"
            id="fatherName"
            name="fatherName"
            value={formData.fatherName || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="aadharNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Aadhar Number
          </label>
          <input
            type="text"
            id="aadharNumber"
            name="aadharNumber"
            value={formData.aadharNumber || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone *
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            required
          />
        </div>
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender || 'male'}
            onChange={handleNativeSelectChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="">N/A</option>
          </select>
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-1">
            Branch *
          </label>
          <Select
            options={branchOptions}
            value={branchOptions.find(option => option.value === formData.branchId) || null}
            onChange={(option: SelectOption | null) => handleSelectChange('branchId', option)}
            placeholder="Select a branch"
            className="w-full"
            isDisabled={branches.length === 0}
            required
          />
        </div>
        <div>
          <label htmlFor="membershipStart" className="block text-sm font-medium text-gray-700 mb-1">
            Membership Start *
          </label>
          <input
            type="date"
            id="membershipStart"
            name="membershipStart"
            value={formData.membershipStart}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            required
          />
        </div>
        <div>
          <label htmlFor="membershipEnd" className="block text-sm font-medium text-gray-700 mb-1">
            Membership End *
          </label>
          <input
            type="date"
            id="membershipEnd"
            name="membershipEnd"
            value={formData.membershipEnd}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            required
          />
        </div>
        <div>
          <label htmlFor="createdAt" className="block text-sm font-medium text-gray-700 mb-1">
            Registration Date *
          </label>
          <input
            type="date"
            id="createdAt"
            name="createdAt"
            value={formData.createdAt}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            required
          />
        </div>
        <div>
          <label htmlFor="shiftId" className="block text-sm font-medium text-gray-700 mb-1">
            Select Shifts *
          </label>
          <Select
            isMulti
            options={shiftOptions}
            value={shiftOptions.filter(opt => selectedShiftIds.includes(opt.value))}
            onChange={(opts) => handleShiftChange(opts as readonly ShiftOption[])}
            isLoading={loadingShifts}
            placeholder={
              loadingShifts
                ? 'Loading shifts...'
                : !formData.branchId
                  ? 'Select a branch first'
                  : shifts.length === 0
                    ? 'No shifts found for this branch'
                    : 'Select shifts'
            }
            className="w-full"
            isDisabled={!formData.branchId || loadingShifts}
          />
        </div>
        <div>
          <label htmlFor="seatId" className="block text-sm font-medium text-gray-700 mb-1">
            Select Seat *
          </label>
          <Select
            options={seatOptions}
            value={seatOptions.find(option => option.value === formData.seatId) || null}
            onChange={(option: SelectOption | null) => handleSelectChange('seatId', option)}
            isLoading={loadingSeats}
            placeholder={
              !formData.branchId
                ? 'Select a branch first'
                : selectedShiftIds.length === 0
                  ? 'Select shifts first'
                  : seats.length === 0
                    ? 'No available seats for selected shifts'
                    : 'Select a seat'
            }
            className="w-full"
            isDisabled={!formData.branchId || selectedShiftIds.length === 0 || seats.length === 0}
          />
        </div>
        <div>
          <label htmlFor="lockerId" className="block text-sm font-medium text-gray-700 mb-1">
            Select Locker
          </label>
          <Select
            options={lockerOptions}
            value={lockerOptions.find(option => option.value === formData.lockerId) || null}
            onChange={(option: SelectOption | null) => handleSelectChange('lockerId', option)}
            isLoading={loadingLockers}
            placeholder={formData.branchId ? "Select an available locker" : "Select a branch first"}
            className="w-full"
            isDisabled={!formData.branchId || lockers.length === 0}
          />
        </div>
        <div>
          <label htmlFor="totalFee" className="block text-sm font-medium text-gray-700 mb-1">
            Total Fee *
          </label>
          <input
            type="number"
            id="totalFee"
            name="totalFee"
            value={formData.totalFee}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-1">
            Discount
          </label>
          <input
            type="number"
            id="discount"
            name="discount"
            value={formData.discount}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="cash" className="block text-sm font-medium text-gray-700 mb-1">
            Cash Payment
          </label>
          <input
            type="number"
            id="cash"
            name="cash"
            value={formData.cash}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="online" className="block text-sm font-medium text-gray-700 mb-1">
            Online Payment
          </label>
          <input
            type="number"
            id="online"
            name="online"
            value={formData.online}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="securityMoney" className="block text-sm font-medium text-gray-700 mb-1">
            Security Money
          </label>
          <input
            type="number"
            id="securityMoney"
            name="securityMoney"
            value={formData.securityMoney}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>
        <div>
          <label htmlFor="amountPaid" className="block text-sm font-medium text-gray-700 mb-1">
            Total Amount Paid
          </label>
          <input
            type="number"
            id="amountPaid"
            name="amountPaid"
            value={totalAmountPaid.toFixed(2)}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="dueAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Due Amount
          </label>
          <input
            type="number"
            id="dueAmount"
            name="dueAmount"
            value={dueAmount.toFixed(2)}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-1">
            Remark
          </label>
          <textarea
            id="remark"
            name="remark"
            value={formData.remark || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            rows={3}
          />
        </div>
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
            Profile Image (max 200KB)
          </label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="aadhaarFront" className="block text-sm font-medium text-gray-700 mb-1">
            Aadhaar Front Image (max 200KB)
          </label>
          <input
            type="file"
            id="aadhaarFront"
            name="aadhaarFront"
            accept="image/*"
            onChange={handleAadhaarFrontChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="aadhaarBack" className="block text-sm font-medium text-gray-700 mb-1">
            Aadhaar Back Image (max 200KB)
          </label>
          <input
            type="file"
            id="aadhaarBack"
            name="aadhaarBack"
            accept="image/*"
            onChange={handleAadhaarBackChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-[#1D9E75] via-[#1A8FA8] to-fuchsia-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-[#0F6E56] hover:via-[#0F6E56] hover:to-fuchsia-700 transition-all duration-200 shadow-md hover:shadow-lg"
          disabled={!!error}
        >
          Add Student
        </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStudentForm;




