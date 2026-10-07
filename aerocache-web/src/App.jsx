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
import { Plane, CheckCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Round trip search state
  const [lastSearchParams, setLastSearchParams] = useState(null);
  const [tripType, setTripType] = useState('oneway'); // 'oneway' | 'roundtrip'
  const [outboundResults, setOutboundResults] = useState(null);
  const [returnResults, setReturnResults] = useState(null);
  const [roundTripStep, setRoundTripStep] = useState(1); // 1: selecting outbound, 2: selecting return
  const [selectedOutboundFare, setSelectedOutboundFare] = useState(null);
  const [selectedReturnFare, setSelectedReturnFare] = useState(null);

  // Passengers state
  const [passengerList, setPassengerList] = useState([
    { id: 'pax-adult-1', index: 1, type: 'ADULT', label: 'Pasajero 1 (Adulto)' }
  ]);
  const [passengersBreakdown, setPassengersBreakdown] = useState({ adults: 1, youths: 0, children: 0, infants: 0 });

  // SeatMap modal state
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapData, setSeatMapData] = useState(null);
  const [outboundSeatMapData, setOutboundSeatMapData] = useState(null);
  const [returnSeatMapData, setReturnSeatMapData] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [assignedSeatsMap, setAssignedSeatsMap] = useState({});
  const [assignedOutboundSeatsMap, setAssignedOutboundSeatsMap] = useState({});
  const [assignedReturnSeatsMap, setAssignedReturnSeatsMap] = useState({});

  // Checkout & Hold state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [holdData, setHoldData] = useState(null);
  const [outboundHoldData, setOutboundHoldData] = useState(null);
  const [returnHoldData, setReturnHoldData] = useState(null);
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
    setLastSearchParams(searchParams);
    const isRound = searchParams.tripType === 'roundtrip';
    setTripType(isRound ? 'roundtrip' : 'oneway');
    setRoundTripStep(1);
    setSelectedOutboundFare(null);
    setSelectedReturnFare(null);
    setOutboundSeatMapData(null);
    setReturnSeatMapData(null);
    setAssignedOutboundSeatsMap({});
    setAssignedReturnSeatsMap({});
    setOutboundHoldData(null);
    setReturnHoldData(null);

    if (searchParams.passengerList) {
      setPassengerList(searchParams.passengerList);
    }
    if (searchParams.passengers) {
      setPassengersBreakdown(searchParams.passengers);
    }

    try {
      if (isRound) {
        const [outData, retData] = await Promise.all([
          searchFlights({
            origin: searchParams.origin,
            destination: searchParams.destination,
            departureDate: searchParams.departureDate,
            passengers: searchParams.passengers
          }),
          searchFlights({
            origin: searchParams.destination,
            destination: searchParams.origin,
            departureDate: searchParams.returnDate,
            passengers: searchParams.passengers
          })
        ]);
        setOutboundResults(outData);
        setReturnResults(retData);
        setSearchResults(null);
      } else {
        const data = await searchFlights(searchParams);
        setSearchResults(data);
        setOutboundResults(null);
        setReturnResults(null);
      }
    } catch (err) {
      setSearchError(err.message);
      setSearchResults(null);
      setOutboundResults(null);
      setReturnResults(null);
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

  // Multiple seats selection handler (One-Way)
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

  // Round-trip seat selection handler (Both legs)
  const handleSelectRoundTripSeats = async ({ outboundSeatsMap, returnSeatsMap }) => {
    setAssignedOutboundSeatsMap(outboundSeatsMap);
    setAssignedReturnSeatsMap(returnSeatsMap);
    setSearchLoading(true);
    try {
      const [outHold, retHold] = await Promise.all([
        createHold(
          selectedOutboundFare.offerId,
          selectedOutboundFare.itineraryId,
          selectedOutboundFare.cabinClass,
          selectedOutboundFare.fareBrand,
          passengersBreakdown
        ),
        createHold(
          selectedReturnFare.offerId,
          selectedReturnFare.itineraryId,
          selectedReturnFare.cabinClass,
          selectedReturnFare.fareBrand,
          passengersBreakdown
        )
      ]);

      setOutboundHoldData(outHold);
      setReturnHoldData(retHold);
      setSeatMapOpen(false);
      setIsBookingFlow(false);
      setCheckoutOpen(true);
    } catch (err) {
      alert('Error al congelar tarifas para ida y vuelta: ' + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSeat = (seat) => {
    setSelectedSeat(seat);
    const firstId = passengerList[0]?.id || 'pax-adult-1';
    const newMap = { ...assignedSeatsMap, [firstId]: seat };
    setAssignedSeatsMap(newMap);
  };

  // User selects fare
  const handleSelectFare = async (fareInfo) => {
    if (tripType === 'roundtrip') {
      if (roundTripStep === 1) {
        // Step 1: Outbound fare chosen!
        setSelectedOutboundFare(fareInfo);
        setRoundTripStep(2);
        window.scrollTo({ top: 400, behavior: 'smooth' });
        return;
      }

      if (roundTripStep === 2) {
        // Step 2: Return fare chosen!
        setSelectedReturnFare(fareInfo);
        setIsBookingFlow(true);
        setSearchLoading(true);
        try {
          const outSegId = selectedOutboundFare.segment?.segmentId || `SEG-${selectedOutboundFare.offerId.replace('OFF-', '')}`;
          const retSegId = fareInfo.segment?.segmentId || `SEG-${fareInfo.offerId.replace('OFF-', '')}`;
          const [outMap, retMap] = await Promise.all([
            getSeatMap(selectedOutboundFare.offerId, outSegId),
            getSeatMap(fareInfo.offerId, retSegId)
          ]);
          setOutboundSeatMapData(outMap);
          setReturnSeatMapData(retMap);
          setSeatMapOpen(true);
        } catch (err) {
          alert('Error al cargar mapas de asientos: ' + err.message);
        } finally {
          setSearchLoading(false);
        }
        return;
      }
    }

    // One-Way flow
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

    // Bloquear inmediatamente los asientos en almacenamiento local persistente
    try {
      const stored = JSON.parse(localStorage.getItem('aerocache_blocked_seats') || '{}');

      if (booking.isRoundTrip) {
        // Outbound
        const outFlight = booking.outboundFlightNumber || selectedOutboundFare?.segment?.flightNumber;
        const outSeats = booking.passengers?.map(p => p.outboundSeat || p.assignedSeatNumber).filter(Boolean) || [];
        if (outFlight && outSeats.length > 0) {
          const list = stored[outFlight] || [];
          outSeats.forEach(s => { if (!list.includes(s)) list.push(s); });
          stored[outFlight] = list;
        }

        // Return
        const retFlight = booking.returnFlightNumber || selectedReturnFare?.segment?.flightNumber;
        const retSeats = booking.passengers?.map(p => p.returnSeat).filter(Boolean) || [];
        if (retFlight && retSeats.length > 0) {
          const list = stored[retFlight] || [];
          retSeats.forEach(s => { if (!list.includes(s)) list.push(s); });
          stored[retFlight] = list;
        }
      } else {
        const flightNum = booking.itineraries?.[0]?.segments?.[0]?.flightNumber 
          || pendingFare?.segment?.flightNumber 
          || selectedFare?.segment?.flightNumber;
        const seats = booking.passengers?.map(p => p.assignedSeatNumber).filter(Boolean) || [];
        if (flightNum && seats.length > 0) {
          const list = stored[flightNum] || [];
          seats.forEach(s => { if (!list.includes(s)) list.push(s); });
          stored[flightNum] = list;
        }
      }
      localStorage.setItem('aerocache_blocked_seats', JSON.stringify(stored));
    } catch (e) {
      console.warn('Error al persistir bloqueo de asiento local:', e);
    }

    // Auto check-in y generación de pases
    try {
      if (booking.isRoundTrip) {
        let allPasses = [];
        if (booking.outboundBooking?.bookingId) {
          await performCheckIn(booking.outboundBooking.bookingId);
          const bpOut = await getBoardingPasses(booking.outboundBooking.bookingId);
          if (bpOut?.boardingPasses) allPasses.push(...bpOut.boardingPasses);
        }
        if (booking.returnBooking?.bookingId) {
          await performCheckIn(booking.returnBooking.bookingId);
          const bpRet = await getBoardingPasses(booking.returnBooking.bookingId);
          if (bpRet?.boardingPasses) allPasses.push(...bpRet.boardingPasses);
        }
        setCurrentBoardingPasses(allPasses);
      } else {
        await performCheckIn(booking.bookingId);
        const bp = await getBoardingPasses(booking.bookingId);
        setCurrentBoardingPasses(bp.boardingPasses || []);
      }
      setBoardingPassOpen(true);
    } catch (err) {
      console.warn('Auto check-in aviso:', err);
      setBoardingPassOpen(true);
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
            {/* Hero Section */}
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
                  Vuelos diarios y directos entre <strong>Quito</strong>, <strong>Guayaquil</strong>, <strong>Cuenca</strong>, <strong>Galápagos</strong> y más.
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

              {/* Round-Trip Stepper Header */}
              {tripType === 'roundtrip' && (outboundResults || returnResults) && (
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  marginBottom: '28px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 25, 53, 0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: 'var(--color-latam-coral)', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px' }}>
                        VIAJE IDA Y VUELTA
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-latam-navy)', margin: 0 }}>
                        Selecciona tus vuelos para continuar a la asignación de asientos
                      </h3>
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      Paso {roundTripStep} de 2
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Step 1 Card: Vuelo de Ida */}
                    <div 
                      onClick={() => { if (selectedOutboundFare) setRoundTripStep(1); }}
                      style={{
                        border: roundTripStep === 1 ? '2px solid var(--color-latam-coral)' : (selectedOutboundFare ? '1px solid #10b981' : '1px solid #e2e8f0'),
                        backgroundColor: roundTripStep === 1 ? '#fff1f2' : (selectedOutboundFare ? '#f0fdf4' : '#f8fafc'),
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: selectedOutboundFare ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '14px', color: 'var(--color-latam-navy)' }}>
                          <Plane size={16} color="var(--color-latam-coral)" />
                          1. VUELO DE IDA: {lastSearchParams?.origin} ➔ {lastSearchParams?.destination}
                        </div>
                        {selectedOutboundFare ? (
                          <span style={{ color: '#059669', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Seleccionado
                          </span>
                        ) : (
                          <span style={{ backgroundColor: roundTripStep === 1 ? 'var(--color-latam-coral)' : '#94a3b8', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                            {roundTripStep === 1 ? 'En selección' : 'Pendiente'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        Fecha: <strong>{lastSearchParams?.departureDate}</strong>
                      </div>
                      {selectedOutboundFare ? (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Vuelo <strong>{selectedOutboundFare.segment?.flightNumber}</strong> • Tarifa <strong>{selectedOutboundFare.fareBrand}</strong> • <strong>${selectedOutboundFare.price} USD</strong></span>
                          <span style={{ color: 'var(--color-latam-coral)', textDecoration: 'underline', fontWeight: '700', fontSize: '11px' }}>Cambiar</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Elige tu vuelo de ida en la lista inferior
                        </div>
                      )}
                    </div>

                    {/* Step 2 Card: Vuelo de Vuelta */}
                    <div 
                      onClick={() => { if (selectedOutboundFare && roundTripStep === 1) setRoundTripStep(2); }}
                      style={{
                        border: roundTripStep === 2 ? '2px solid var(--color-latam-coral)' : (selectedReturnFare ? '1px solid #10b981' : '1px solid #e2e8f0'),
                        backgroundColor: roundTripStep === 2 ? '#fff1f2' : (selectedReturnFare ? '#f0fdf4' : '#f8fafc'),
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: (selectedOutboundFare && roundTripStep === 1) ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '14px', color: 'var(--color-latam-navy)' }}>
                          <Plane size={16} color="#0284c7" style={{ transform: 'rotate(180deg)' }} />
                          2. VUELO DE VUELTA: {lastSearchParams?.destination} ➔ {lastSearchParams?.origin}
                        </div>
                        {selectedReturnFare ? (
                          <span style={{ color: '#059669', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Seleccionado
                          </span>
                        ) : (
                          <span style={{ backgroundColor: roundTripStep === 2 ? 'var(--color-latam-coral)' : '#94a3b8', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                            {roundTripStep === 2 ? 'En selección' : 'Paso siguiente'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        Fecha: <strong>{lastSearchParams?.returnDate}</strong>
                      </div>
                      {selectedReturnFare ? (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#0f172a' }}>
                          Vuelo <strong>{selectedReturnFare.segment?.flightNumber}</strong> • Tarifa <strong>{selectedReturnFare.fareBrand}</strong> • <strong>${selectedReturnFare.price} USD</strong>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {selectedOutboundFare ? 'Elige tu vuelo de regreso para elegir asientos de Ida y Vuelta' : 'Disponible después de elegir el vuelo de ida'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Round-trip Step 1: Outbound offers */}
              {tripType === 'roundtrip' && roundTripStep === 1 && outboundResults && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
                      1. Vuelos de Ida: {lastSearchParams?.origin} ➔ {lastSearchParams?.destination} ({outboundResults.totalOffers || 0})
                    </h2>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      Precios por adulto con tasas e IVA incluidos
                    </span>
                  </div>

                  {outboundResults.offers?.map(offer => (
                    <FlightCard
                      key={offer.offerId}
                      offer={offer}
                      onSelectFare={handleSelectFare}
                      onOpenSeatMap={handleOpenSeatMap}
                    />
                  ))}
                </div>
              )}

              {/* Round-trip Step 2: Return offers */}
              {tripType === 'roundtrip' && roundTripStep === 2 && returnResults && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
                      2. Vuelos de Vuelta: {lastSearchParams?.destination} ➔ {lastSearchParams?.origin} ({returnResults.totalOffers || 0})
                    </h2>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      Selecciona tu vuelo de vuelta para elegir asientos de Ida y Vuelta
                    </span>
                  </div>

                  {returnResults.offers?.map(offer => (
                    <FlightCard
                      key={offer.offerId}
                      offer={offer}
                      onSelectFare={handleSelectFare}
                      onOpenSeatMap={handleOpenSeatMap}
                    />
                  ))}
                </div>
              )}

              {/* One-Way results */}
              {tripType === 'oneway' && searchResults && (
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
        seatMapData={tripType === 'roundtrip' ? outboundSeatMapData : seatMapData}
        onSelectSeat={handleSelectSeat}
        onSelectSeats={handleSelectSeats}
        selectedSeat={selectedFare?.selectedSeat || selectedSeat}
        selectedSeatsMap={assignedSeatsMap}
        passengerList={passengerList}
        flightInfo={tripType === 'roundtrip' ? selectedOutboundFare?.segment?.flightNumber : (pendingFare?.segment?.flightNumber || selectedFare?.segment?.flightNumber)}
        isBookingFlow={isBookingFlow}
        selectedFareBrand={tripType === 'roundtrip' ? selectedOutboundFare?.fareBrand : (pendingFare?.fareBrand || selectedFare?.fareBrand)}
        // Round trip support
        isRoundTrip={isBookingFlow && tripType === 'roundtrip'}
        outboundInfo={{
          flightNumber: selectedOutboundFare?.segment?.flightNumber || 'AC1401',
          route: `${lastSearchParams?.origin || 'UIO'} ➔ ${lastSearchParams?.destination || 'GYE'}`,
          fareBrand: selectedOutboundFare?.fareBrand || 'Top',
          seatMapData: outboundSeatMapData
        }}
        returnInfo={{
          flightNumber: selectedReturnFare?.segment?.flightNumber || 'AC1402',
          route: `${lastSearchParams?.destination || 'GYE'} ➔ ${lastSearchParams?.origin || 'UIO'}`,
          fareBrand: selectedReturnFare?.fareBrand || 'Top',
          seatMapData: returnSeatMapData
        }}
        onSelectRoundTripSeats={handleSelectRoundTripSeats}
        selectedOutboundSeatsMap={assignedOutboundSeatsMap}
        selectedReturnSeatsMap={assignedReturnSeatsMap}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        holdData={holdData}
        selectedFare={selectedFare}
        passengerList={passengerList}
        assignedSeatsMap={tripType === 'roundtrip' ? assignedOutboundSeatsMap : assignedSeatsMap}
        onBookingSuccess={handleBookingSuccess}
        onOpenSeatMap={handleOpenSeatMap}
        // Round trip support
        isRoundTrip={tripType === 'roundtrip'}
        outboundFare={selectedOutboundFare}
        returnFare={selectedReturnFare}
        outboundHoldData={outboundHoldData}
        returnHoldData={returnHoldData}
        returnAssignedSeatsMap={assignedReturnSeatsMap}
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
