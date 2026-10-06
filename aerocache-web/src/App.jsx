import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FlightSearchWidget from './components/FlightSearchWidget';
import FlightCard from './components/FlightCard';
import SeatMapModal from './components/SeatMapModal';
import CheckoutModal from './components/CheckoutModal';
import BoardingPassModal from './components/BoardingPassModal';
import MyBookingsView from './pages/MyBookingsView';
import FlightStatusView from './pages/FlightStatusView';
import AdminDashboardView from './pages/AdminDashboardView';
import { searchFlights, getSeatMap, createHold, performCheckIn, getBoardingPasses } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Passengers state
  const [passengerList, setPassengerList] = useState([
    { id: 'pax-adult-1', index: 1, type: 'ADULT', label: 'Pasajero 1 (Adulto)' }
  ]);
  const [passengersBreakdown, setPassengersBreakdown] = useState({ adults: 1, youths: 0, children: 0, infants: 0 });

  // SeatMap modal state
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapData, setSeatMapData] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [assignedSeatsMap, setAssignedSeatsMap] = useState({});

  // Checkout & Hold state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [holdData, setHoldData] = useState(null);
  const [selectedFare, setSelectedFare] = useState(null);

  // Boarding Pass modal state
  const [boardingPassOpen, setBoardingPassOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [currentBoardingPasses, setCurrentBoardingPasses] = useState([]);

  // Hold & Pending Fare state for step-by-step seat selection
  const [pendingFare, setPendingFare] = useState(null);
  const [isBookingFlow, setIsBookingFlow] = useState(false);

  const handleSearch = async (searchParams) => {
    setSearchLoading(true);
    setSearchError(null);
    if (searchParams.passengerList) {
      setPassengerList(searchParams.passengerList);
    }
    if (searchParams.passengers) {
      setPassengersBreakdown(searchParams.passengers);
    }
    try {
      const data = await searchFlights(searchParams);
      setSearchResults(data);
    } catch (err) {
      setSearchError(err.message);
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOpenSeatMap = async (offerId, segmentId) => {
    setIsBookingFlow(false);
    try {
      const data = await getSeatMap(offerId, segmentId);
      setSeatMapData(data);
      setSeatMapOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Multiple seats selection handler
  const handleSelectSeats = async (seatsMap, paxList) => {
    setAssignedSeatsMap(seatsMap);
    const firstSeat = Object.values(seatsMap)[0] || '14A';
    setSelectedSeat(firstSeat);

    // If changing seat from already opened checkout:
    if (selectedFare && !isBookingFlow) {
      setSelectedFare(prev => ({ ...prev, assignedSeatsMap: seatsMap, selectedSeat: firstSeat }));
      return;
    }

    // Step 1 -> Step 2: Proceed to Checkout with selected seats
    if (pendingFare && isBookingFlow) {
      const fareInfo = pendingFare;
      try {
        const hold = await createHold(
          fareInfo.offerId,
          fareInfo.itineraryId,
          fareInfo.cabinClass,
          fareInfo.fareBrand,
          passengersBreakdown
        );
        setHoldData(hold);
        setSelectedFare({ ...fareInfo, assignedSeatsMap: seatsMap, selectedSeat: firstSeat });
        setCheckoutOpen(true);
      } catch (err) {
        alert('Error al congelar tarifa: ' + err.message);
      } finally {
        setIsBookingFlow(false);
      }
    }
  };

  const handleSelectSeat = (seat) => {
    setSelectedSeat(seat);
    const firstId = passengerList[0]?.id || 'pax-adult-1';
    const newMap = { ...assignedSeatsMap, [firstId]: seat };
    setAssignedSeatsMap(newMap);
  };

  // Step 1: User selects fare -> Opens SeatMap FIRST!
  const handleSelectFare = async (fareInfo) => {
    setPendingFare(fareInfo);
    setIsBookingFlow(true);
    try {
      const segId = fareInfo.segment?.segmentId || `SEG-${fareInfo.offerId.replace('OFF-', '')}`;
      const data = await getSeatMap(fareInfo.offerId, segId);
      setSeatMapData(data);
      setSeatMapOpen(true);
    } catch (err) {
      alert('Error al cargar mapa de asientos: ' + err.message);
    }
  };

  const handleBookingSuccess = async (booking) => {
    setCheckoutOpen(false);
    setCurrentBooking(booking);

    // Bloquear inmediatamente todos los asientos confirmados en almacenamiento local persistente
    try {
      const flightNum = booking.itineraries?.[0]?.segments?.[0]?.flightNumber 
        || pendingFare?.segment?.flightNumber 
        || selectedFare?.segment?.flightNumber;
      
      const seatsToBlock = [];
      if (Array.isArray(booking.passengers)) {
        booking.passengers.forEach(p => {
          if (p.assignedSeatNumber && !seatsToBlock.includes(p.assignedSeatNumber)) {
            seatsToBlock.push(p.assignedSeatNumber);
          }
        });
      }
      if (assignedSeatsMap) {
        Object.values(assignedSeatsMap).forEach(s => {
          if (s && !seatsToBlock.includes(s)) seatsToBlock.push(s);
        });
      }
      if (selectedFare?.selectedSeat && !seatsToBlock.includes(selectedFare.selectedSeat)) {
        seatsToBlock.push(selectedFare.selectedSeat);
      }

      if (flightNum && seatsToBlock.length > 0) {
        const stored = JSON.parse(localStorage.getItem('aerocache_blocked_seats') || '{}');
        const list = stored[flightNum] || [];
        seatsToBlock.forEach(s => {
          if (!list.includes(s)) {
            list.push(s);
          }
        });
        stored[flightNum] = list;
        localStorage.setItem('aerocache_blocked_seats', JSON.stringify(stored));
      }
    } catch (e) {
      console.warn('Error al persistir bloqueo de asiento local:', e);
    }

    try {
      // Auto check-in and show boarding pass
      await performCheckIn(booking.bookingId);
      const bp = await getBoardingPasses(booking.bookingId);
      setCurrentBoardingPasses(bp.boardingPasses || []);
      setBoardingPassOpen(true);
    } catch (err) {
      alert(`Reserva creada con éxito! Código PNR: ${booking.pnr}`);
    }
  };

  const handleOpenExistingBoardingPass = async (booking) => {
    setCurrentBooking(booking);
    try {
      const bp = await getBoardingPasses(booking.bookingId);
      setCurrentBoardingPasses(bp.boardingPasses || []);
      setBoardingPassOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1 }}>
        {activeTab === 'search' && (
          <div>
            {/* Hero Section inspired by LATAM Airlines */}
            <div style={{
              background: 'linear-gradient(180deg, var(--color-latam-navy) 0%, #0d284a 60%, var(--color-latam-gray-bg) 100%)',
              padding: '40px 20px 80px 20px',
              textAlign: 'center',
              color: '#fff'
            }}>
              <div style={{ maxWidth: '800px', margin: '0 auto 30px auto' }}>
                <span style={{ backgroundColor: 'rgba(232, 17, 75, 0.2)', color: '#ff4b72', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(232, 17, 75, 0.4)' }}>
                  AEROLÍNEA NACIONAL DEL ECUADOR
                </span>
                <h1 style={{ fontSize: '38px', fontWeight: '900', marginTop: '14px', letterSpacing: '-0.5px' }}>
                  Viaja por Ecuador al mejor precio con AEROCACHE
                </h1>
                <p style={{ fontSize: '16px', color: '#cbd5e1', marginTop: '8px' }}>
                  Vuelos diarios y directos entre <strong>Quito</strong>, <strong>Guayaquil</strong> y <strong>Cuenca</strong>.
                </p>
              </div>

              {/* Search Widget */}
              <div style={{ transform: 'translateY(30px)' }}>
                <FlightSearchWidget onSearch={handleSearch} loading={searchLoading} />
              </div>
            </div>

            {/* Results Section */}
            <div style={{ maxWidth: '1100px', margin: '60px auto 40px auto', padding: '0 20px' }}>
              {searchError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  {searchError}
                </div>
              )}

              {searchResults && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
                      Vuelos Disponibles ({searchResults.totalOffers})
                    </h2>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      Precios por adulto con tasas e IVA incluidos
                    </span>
                  </div>

                  {searchResults.offers?.map(offer => (
                    <FlightCard
                      key={offer.offerId}
                      offer={offer}
                      onSelectFare={handleSelectFare}
                      onOpenSeatMap={handleOpenSeatMap}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <MyBookingsView onOpenBoardingPass={handleOpenExistingBoardingPass} />
        )}

        {activeTab === 'checkin' && (
          <MyBookingsView onOpenBoardingPass={handleOpenExistingBoardingPass} />
        )}

        {activeTab === 'status' && (
          <FlightStatusView />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardView />
        )}
      </main>

      {/* Modals */}
      <SeatMapModal
        isOpen={seatMapOpen}
        onClose={() => { setSeatMapOpen(false); setIsBookingFlow(false); }}
        seatMapData={seatMapData}
        onSelectSeat={handleSelectSeat}
        onSelectSeats={handleSelectSeats}
        selectedSeat={selectedFare?.selectedSeat || selectedSeat}
        selectedSeatsMap={assignedSeatsMap}
        passengerList={passengerList}
        flightInfo={pendingFare?.segment?.flightNumber || selectedFare?.segment?.flightNumber}
        isBookingFlow={isBookingFlow}
        selectedFareBrand={pendingFare?.fareBrand || selectedFare?.fareBrand}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        holdData={holdData}
        selectedFare={selectedFare}
        passengerList={passengerList}
        assignedSeatsMap={assignedSeatsMap}
        onBookingSuccess={handleBookingSuccess}
        onOpenSeatMap={handleOpenSeatMap}
      />

      <BoardingPassModal
        isOpen={boardingPassOpen}
        onClose={() => setBoardingPassOpen(false)}
        booking={currentBooking}
        boardingPasses={currentBoardingPasses}
      />

      <Footer />
    </div>
  );
}
