import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Calendar from 'react-calendar'
import { format, isAfter, isBefore, startOfDay, addDays, addWeeks, addMinutes } from 'date-fns'
import 'react-calendar/dist/Calendar.css'
import '../styles/AppointmentsBooking.css'
import Sidenav from './Sidenav'
import Header from './Header'

// Organized appointment types data structure
const APPOINTMENT_TYPES = {
  "Routine Check-Ups & Screenings": [
    "Annual pelvic exam",
    "Pap smear",
    "Breast exam",
    "HPV screening",
    "STI testing"
  ],
  "Birth Control & Family Planning": [
    "Contraceptive counseling",
    "Birth control prescriptions",
    "IUD insertion/removal",
    "Implant insertion/removal",
    "Emergency contraception"
  ],
  "Pregnancy-Related Appointments": [
    "Preconception counseling",
    "Prenatal care",
    "Ultrasound appointments",
    "Genetic screening and testing",
    "Labor and delivery planning",
    "Postpartum check-up"
  ],
  "Menstrual and Hormonal Issues": [
    "Irregular periods",
    "Painful or heavy menstruation",
    "PMS or PMDD management",
    "Perimenopause and menopause care",
    "Hormone therapy"
  ],
  "Gynecological Concerns": [
    "Vaginal infections",
    "Urinary tract infections (UTIs)",
    "Pelvic pain",
    "Endometriosis",
    "Polycystic ovary syndrome (PCOS)",
    "Ovarian cysts or fibroids"
  ],
  "Fertility & Infertility Services": [
    "Fertility evaluation",
    "Ovulation tracking",
    "Referral for assisted reproductive technologies"
  ],
  "Surgeries & Procedures": [
    "Colposcopy",
    "Endometrial biopsy",
    "Laparoscopy",
    "D&C (dilation and curettage)",
    "Hysteroscopy",
    "Hysterectomy consultations"
  ],
  "Sexual Health & Counseling": [
    "Sexual dysfunction",
    "Pain during intercourse",
    "Libido issues",
    "LGBTQ+ reproductive health counseling"
  ]
};

export default function AppointmentBooking() {
  const { user } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [] })
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [pollingInterval, setPollingInterval] = useState(null);
  
  // State variables for appointment types
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [typesForCategory, setTypesForCategory] = useState([]);

  // Define fixed time slots with UTC awareness
  const TIME_SLOTS = {
    morning: [
      { start: '08:00', end: '09:00', label: '8:00-9:00 AM' },
      { start: '09:00', end: '10:00', label: '9:00-10:00 AM' },
      { start: '10:00', end: '11:00', label: '10:00-11:00 AM' },
      { start: '11:00', end: '12:00', label: '11:00-12:00 PM' }
    ],
    afternoon: [
      { start: '13:00', end: '14:00', label: '1:00-2:00 PM' },
      { start: '14:00', end: '15:00', label: '2:00-3:00 PM' },
      { start: '15:00', end: '16:00', label: '3:00-4:00 PM' },
      { start: '16:00', end: '17:00', label: '4:00-5:00 PM' }
    ]
  };

  // Update appointment types when category changes
  useEffect(() => {
    if (selectedCategory) {
      setTypesForCategory(APPOINTMENT_TYPES[selectedCategory] || []);
      setSelectedType(""); // Reset selected type when category changes
    } else {
      setTypesForCategory([]);
      setSelectedType("");
    }
  }, [selectedCategory]);

  // Function to check if a slot overlaps with any booked slots
  const isSlotOverlapping = (slot, bookedSlots) => {
    return bookedSlots.some(bookedSlot => {
      const slotStart = slot.start;
      const slotEnd = slot.end;
      const bookedStart = bookedSlot.start_time;
      const bookedEnd = bookedSlot.end_time;
      
      return (
        (slotStart >= bookedStart && slotStart < bookedEnd) ||
        (slotEnd > bookedStart && slotEnd <= bookedEnd) ||
        (slotStart <= bookedStart && slotEnd >= bookedEnd)
      );
    });
  };

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    fetchDoctors()
    fetchUpcomingAppointments()
  }, [user])

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots({ morning: [], afternoon: [] })
    }
  }, [selectedDoctor, selectedDate])

  useEffect(() => {
    let interval;
    
    const startPolling = () => {
      // Initial fetch
      if (selectedDoctor && selectedDate) {
        fetchAvailableSlots();
      }

      // Set up polling every 10 seconds
      interval = setInterval(() => {
        if (selectedDoctor && selectedDate) {
          fetchAvailableSlots(true); // Pass true to indicate this is a polling update
        }
      }, 10000); // 10 seconds interval

      setPollingInterval(interval);
    };

    startPolling();

    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedDoctor, selectedDate]);

  const fetchUpcomingAppointments = async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            full_name,
            specialty
          )
        `)
        .eq('patient_id', user.id)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5)

      if (error) throw error
      setUpcomingAppointments(data || [])
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error)
      setUpcomingAppointments([])
    }
  }

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('user_id, full_name, specialty')
        .order('full_name')

      if (error) throw error
      setDoctors(data || [])
    } catch (error) {
      setError('Error fetching doctors: ' + error.message)
    }
  }

  const fetchAvailableSlots = async (isPolling = false) => {
    if (!selectedDoctor || !selectedDate) {
      setAvailableSlots({ morning: [], afternoon: [] });
      return;
    }
    
    if (!isPolling) {
      setLoadingSlots(true);
    }
    setError(null);
    
    try {
      const selectedDateTime = new Date(selectedDate);
      const dayOfWeek = selectedDateTime.getDay();
      
      // Weekend check
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setError('Appointments are not available on weekends');
        setAvailableSlots({ morning: [], afternoon: [] });
        return;
      }

      const today = startOfDay(new Date());
      
      // Past date check
      if (isBefore(selectedDateTime, today)) {
        setError('Cannot book appointments for past dates');
        setAvailableSlots({ morning: [], afternoon: [] });
        return;
      }

      // Future date check
      const maxDate = addWeeks(today, 2);
      if (isAfter(selectedDateTime, maxDate)) {
        setError('Cannot book appointments more than 2 weeks in advance');
        setAvailableSlots({ morning: [], afternoon: [] });
        return;
      }

      // Fetch booked slots with status check
      const { data: bookedSlots, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('doctor_id', selectedDoctor)
        .eq('appointment_date', selectedDate)
        .in('status', ['pending', 'confirmed']);

      if (appointmentsError) throw appointmentsError;

      const currentTime = new Date();
      const isToday = format(selectedDateTime, 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd');

      // Enhanced slot filtering
      const filterSlots = (slots, bookedSlots) => {
        return slots.filter(slot => {
          // Check if slot is booked
          const isBooked = bookedSlots?.some(bookedSlot => 
            slot.start === bookedSlot.start_time && 
            slot.end === bookedSlot.end_time &&
            ['pending', 'confirmed'].includes(bookedSlot.status)
          );

          if (isBooked) return false;

          // Check if slot is in the past (for today)
          if (isToday) {
            const slotTime = new Date(`${selectedDate}T${slot.start}`);
            return isAfter(slotTime, addMinutes(currentTime, 30));
          }

          return true;
        });
      };

      // Filter slots with enhanced logic
      setAvailableSlots({
        morning: filterSlots(TIME_SLOTS.morning, bookedSlots),
        afternoon: filterSlots(TIME_SLOTS.afternoon, bookedSlots)
      });

      // If the currently selected slot is now booked, deselect it
      if (selectedSlot) {
        const isSelectedSlotBooked = bookedSlots?.some(
          bookedSlot => 
            selectedSlot.start === bookedSlot.start_time && 
            selectedSlot.end === bookedSlot.end_time
        );
        
        if (isSelectedSlotBooked) {
          setSelectedSlot(null);
          if (!isPolling) {
            setError('The selected time slot is no longer available');
          }
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setError('Error fetching available slots: ' + error.message);
      setAvailableSlots({ morning: [], afternoon: [] });
    } finally {
      if (!isPolling) {
        setLoadingSlots(false);
      }
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const selectedTimeSlot = [...TIME_SLOTS.morning, ...TIME_SLOTS.afternoon]
      .find(slot => slot.start === selectedSlot.start && slot.end === selectedSlot.end);
    
    const doctor = doctors.find(d => d.user_id === selectedDoctor);
    
    const confirmed = window.confirm(
      `Confirm ${selectedType} appointment with Dr. ${doctor?.full_name} on ${format(new Date(selectedDate), 'MMMM d, yyyy')} at ${selectedTimeSlot.label}?`
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    setError(null);
    
    // Optimistically update UI
    setLoadingStates(prev => ({
      ...prev,
      [`${selectedTimeSlot.start}-${selectedTimeSlot.end}`]: true
    }));
    
    try {
      // Double-check availability before booking
      const { data: existingBookings, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', selectedDoctor)
        .eq('appointment_date', selectedDate)
        .eq('start_time', selectedTimeSlot.start)
        .eq('end_time', selectedTimeSlot.end)
        .in('status', ['pending', 'confirmed']);
      
      if (checkError) throw checkError;
      
      if (existingBookings && existingBookings.length > 0) {
        throw new Error('This time slot has just been booked. Please select another slot.');
      }

      const { error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: user.id,
          doctor_id: selectedDoctor,
          appointment_date: selectedDate,
          start_time: selectedTimeSlot.start,
          end_time: selectedTimeSlot.end,
          reason: reason.trim(),
          status: 'pending',
          appointment_category: selectedCategory, // Store the category
          appointment_type: selectedType, // Store the specific type
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      setSuccess(true);
      fetchUpcomingAppointments();
      await fetchAvailableSlots(); // Immediate refresh of available slots
      
      // Reset form
      setSelectedSlot(null);
      setReason('');
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      if (error.message.includes('no_overlapping_appointments')) {
        setError('This time slot is already booked');
      } else {
        setError('Error booking appointment: ' + error.message);
      }
    } finally {
      setLoading(false);
      setLoadingStates(prev => ({
        ...prev,
        [`${selectedTimeSlot.start}-${selectedTimeSlot.end}`]: false
      }));
    }
  };

  const validateForm = () => {
    if (!selectedDoctor) {
      setError('Please select a doctor');
      return false;
    }
    if (!selectedDate) {
      setError('Please select a date');
      return false;
    }
    if (!selectedSlot) {
      setError('Please select a time slot');
      return false;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the visit');
      return false;
    }
    if (!selectedCategory) {
      setError('Please select an appointment category');
      return false;
    }
    if (!selectedType) {
      setError('Please select an appointment type');
      return false;
    }
    return true;
  }

  const renderUpcomingAppointments = () => {
    if (upcomingAppointments.length === 0) return null;

    return (
      <div className="upcoming-appointments">
        <h3 className="section-title">Your Upcoming Appointments</h3>
        <div className="appointments-list">
          {upcomingAppointments.map((apt) => (
            <div key={apt.id} className="appointment-card">
              <div className="appointment-date">
                {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
              </div>
              <div className="appointment-time">
                {apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}
              </div>
              <div className="appointment-doctor">
                {apt.doctors?.full_name}
              </div>
              <div className="appointment-type">
                {apt.appointment_type || "General consultation"}
              </div>
              <div className="appointment-status">
                {apt.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderTimeSlots = () => {
    if (!selectedDoctor || !selectedDate) return null;
    if (loadingSlots) return <div className="loading-message">Loading available slots...</div>;
    
    const noMorningSlots = !availableSlots.morning?.length;
    const noAfternoonSlots = !availableSlots.afternoon?.length;
    
    if (noMorningSlots && noAfternoonSlots) {
      return <div className="warning-message">No available slots for the selected date</div>;
    }
  
    return (
      <div className="time-slots-container">
        {!noMorningSlots && (
          <div className="slot-section">
            <h4>Morning</h4>
            <div className="slots-grid">
              {TIME_SLOTS.morning.map((slot) => {
                const isAvailable = availableSlots.morning.some(
                  availableSlot => availableSlot.start === slot.start
                );
                const isLoading = loadingStates[`${slot.start}-${slot.end}`];
                
                return (
                  <button
                    key={slot.start}
                    type="button"
                    className={`slot-button ${
                      selectedSlot?.start === slot.start ? 'selected' : ''
                    } ${!isAvailable ? 'booked' : ''} ${isLoading ? 'loading' : ''}`}
                    onClick={() => isAvailable && !isLoading && setSelectedSlot(slot)}
                    disabled={!isAvailable || isLoading}
                  >
                    {isLoading ? 'Booking...' : slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
  
        {!noAfternoonSlots && (
          <div className="slot-section">
            <h4>Afternoon</h4>
            <div className="slots-grid">
              {TIME_SLOTS.afternoon.map((slot) => {
                const isAvailable = availableSlots.afternoon.some(
                  availableSlot => availableSlot.start === slot.start
                );
                const isLoading = loadingStates[`${slot.start}-${slot.end}`];
                
                return (
                  <button
                    key={slot.start}
                    type="button"
                    className={`slot-button ${
                      selectedSlot?.start === slot.start ? 'selected' : ''
                    } ${!isAvailable ? 'booked' : ''} ${isLoading ? 'loading' : ''}`}
                    onClick={() => isAvailable && !isLoading && setSelectedSlot(slot)}
                    disabled={!isAvailable || isLoading}
                  >
                    {isLoading ? 'Booking...' : slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDoctorCards = () => {
    if (doctors.length === 0) {
      return <div className="loading-message">Loading doctors...</div>;
    }
    
    return (
      <div className="doctors-grid">
        {doctors.map((doctor) => (
          <div
            key={doctor.user_id}
            className={`doctor-card ${selectedDoctor === doctor.user_id ? 'selected' : ''}`}
            onClick={() => {
              setSelectedDoctor(doctor.user_id);
              setSelectedSlot(null);
              setError(null);
            }}
          >
            <h4>Dr. {doctor.full_name}</h4>
            <p>{doctor.specialty}</p>
          </div>
        ))}
      </div>
    );
  }

  const renderAppointmentTypeSelectors = () => {
    return (
      <div className="appointment-type-section">
        <h3 className="section-title">Appointment Type</h3>
        <div className="appointment-type-selectors">
          <div className="form-group">
            <label htmlFor="category">Appointment Category</label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="type-selector"
              required
            >
              <option value="">-- Select Category --</option>
              {Object.keys(APPOINTMENT_TYPES).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Specific Type</label>
            <select
              id="type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="type-selector"
              disabled={!selectedCategory}
              required
            >
              <option value="">-- Select Type --</option>
              {typesForCategory.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderAppointmentSummary = () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return null;

    const doctor = doctors.find(d => d.user_id === selectedDoctor);
    
    return (
      <div className="appointment-summary">
        <h3>Appointment Summary</h3>
        <div className="summary-item">
          <span className="summary-label">Doctor:</span>
          <span>Dr. {doctor?.full_name}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Specialty:</span>
          <span>{doctor?.specialty}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Date:</span>
          <span>{format(new Date(selectedDate), 'MMMM d, yyyy')}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Time:</span>
          <span>{selectedSlot.label}</span>
        </div>
        {selectedCategory && (
          <div className="summary-item">
            <span className="summary-label">Category:</span>
            <span>{selectedCategory}</span>
          </div>
        )}
        {selectedType && (
          <div className="summary-item">
            <span className="summary-label">Appointment Type:</span>
            <span>{selectedType}</span>
          </div>
        )}
        {reason && (
          <div className="summary-item">
            <span className="summary-label">Reason:</span>
            <div className="reason-text">{reason}</div>
          </div>
        )}
      </div>
    );
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarVisible(!isMobileSidebarVisible);
  }

  return (
    <div className="booking-page">
      <Header isSidebarCollapsed={isSidebarCollapsed} />
      
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileSidebarVisible ? 'mobile-visible' : ''}`}>
        <Sidenav 
          onSignOut={handleSignOut}
          onCollapsedChange={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
      </div>
      
      <div className={`booking-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-wrapper">          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Appointment booked successfully!</div>}
          
          {renderUpcomingAppointments()}
          
          <div className="booking-layout">
            <div className="booking-main-content">
              <section className="doctor-selection-section">
                <h3 className="section-title">Select Doctor</h3>
                {renderDoctorCards()}
              </section>
              
              <section className="time-selection-section">
                <h3 className="section-title">Available Times</h3>
                {renderTimeSlots()}
              </section>
              
              {/* Appointment type selection section */}
              {renderAppointmentTypeSelectors()}
              
              <section className="booking-form-section">
                <h3 className="section-title">Complete Booking</h3>
                <div className="booking-form">
                  <div className="form-group">
                    <label htmlFor="reason">Reason for Visit</label>
                    <textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setError(null);
                      }}
                      required
                      rows={4}
                      placeholder="Please describe the reason for your visit"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="book-button"
                    onClick={handleBooking}
                    disabled={loading || !selectedDoctor || !selectedDate || !selectedSlot || !reason.trim() || !selectedCategory || !selectedType}
                  >
                    {loading ? 'Booking...' : 'Book Appointment'}
                  </button>
                </div>
              </section>
            </div>
            
            <div className="booking-sidebar">
              <div className="calendar-widget">
                <h3 className="section-title">Select Date</h3>
                <Calendar
                  onChange={date => {
                    setCalendarDate(date);
                    setSelectedDate(format(date, 'yyyy-MM-dd'));
                    setSelectedSlot(null);
                  }}
                  value={calendarDate}
                  minDate={new Date()}
                  maxDate={addWeeks(new Date(), 2)}
                  tileDisabled={({ date }) => {
                    const dayOfWeek = date.getDay();
                    return dayOfWeek === 0 || dayOfWeek === 6; // Disable weekends
                  }}
                  tileClassName={({ date }) => {
                    const formattedDate = format(date, 'yyyy-MM-dd');
                    const hasAppointment = upcomingAppointments.some(
                      apt => apt.appointment_date === formattedDate
                    );
                    return hasAppointment ? 'has-appointment' : null;
                  }}
                />
              </div>
              
              <div className="summary-widget">
                {renderAppointmentSummary()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile sidebar toggle button */}
      <button 
        className="mobile-sidebar-toggle"
        onClick={toggleMobileSidebar}
        aria-label="Toggle sidebar"
      >
        ≡
      </button>
    </div>
  );
}