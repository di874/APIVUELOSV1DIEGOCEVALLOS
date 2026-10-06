const API_BASE = window.AEROCACHE_API_URL 
  || import.meta.env.VITE_API_URL 
  || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5200' 
      : 'https://apivuelosv1diegocevallos.onrender.com');

export async function searchFlights({ origin, destination, departureDate, passengers }) {
  const body = {
    itineraries: [
      {
        origin,
        destination,
        departureDate: departureDate || new Date().toISOString().split('T')[0]
      }
    ],
    passengers: passengers || { adults: 1, youths: 0, children: 0, infants: 0 }
  };

  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Fingerprint': 'web-fingerprint-' + Math.random().toString(36).substring(2, 9)
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.title || 'Error en la búsqueda de vuelos');
  }

  return await res.json();
}

export async function getSeatMap(offerId, segmentId) {
  const res = await fetch(`${API_BASE}/offers/${offerId}/seatmap?segmentId=${encodeURIComponent(segmentId)}`);
  if (!res.ok) throw new Error('Error al cargar mapa de asientos');
  return await res.json();
}

export async function createHold(offerId, itineraryId, cabinClass, fareBrand, passengers) {
  const body = {
    offerId,
    itinerarySelections: [
      { itineraryId, cabinClass, fareBrand }
    ],
    passengersBreakdown: passengers || { adults: 1, youths: 0, children: 0, infants: 0 }
  };

  const res = await fetch(`${API_BASE}/offers/hold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al congelar la tarifa');
  }

  return await res.json();
}

export async function getHoldStatus(holdId) {
  const res = await fetch(`${API_BASE}/offers/hold/${holdId}`);
  if (!res.ok) throw new Error('Error al consultar hold');
  return await res.json();
}

export async function createBooking(holdId, passengerData, paymentRef) {
  const body = {
    holdId,
    passengers: [
      {
        passengerId: 'PAX-1',
        passengerType: 'ADULT',
        firstName: passengerData.firstName,
        lastName: passengerData.lastName,
        documentType: passengerData.documentType || 'NATIONAL_ID',
        documentNumber: passengerData.documentNumber,
        nationality: 'EC',
        birthDate: passengerData.birthDate || '1995-01-01',
        gender: passengerData.gender || 'M',
        contact: {
          email: passengerData.email,
          phone: passengerData.phone
        },
        assignedSeats: passengerData.assignedSeat ? [{ segmentId: 'SEG-1', seatNumber: passengerData.assignedSeat }] : []
      }
    ],
    payment: {
      paymentReferenceValue: paymentRef || ('PAY-' + Math.random().toString(36).substring(2, 8).toUpperCase())
    }
  };

  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.title || 'Error al crear la reserva');
  }

  return await res.json();
}

export async function getBookingByPnr(pnr) {
  const res = await fetch(`${API_BASE}/bookings?pnr=${encodeURIComponent(pnr)}`);
  if (!res.ok) throw new Error('Error al listar reservas');
  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`No se encontró ninguna reserva con el código PNR "${pnr}"`);
  }
  return await getBookingDetail(data.items[0].bookingId);
}

export async function getBookingDetail(bookingId) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}`);
  if (!res.ok) throw new Error('Reserva no encontrada');
  return await res.json();
}

export async function performCheckIn(bookingId) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al realizar check-in');
  }
  return await res.json();
}

export async function getBoardingPasses(bookingId) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/boarding-passes`);
  if (!res.ok) throw new Error('Pases de abordar no disponibles');
  return await res.json();
}

export async function addBaggage(bookingId, passengerId, itineraryId, quantity = 1) {
  const body = {
    passengerId,
    itineraryId: itineraryId || 'ITIN-1',
    quantity,
    payment: { paymentReferenceValue: 'BAG-PAY-' + Math.random().toString(36).substring(2, 7).toUpperCase() }
  };
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/baggage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al agregar equipaje');
  }
  return await res.json();
}

export async function searchDateChange(bookingId, itineraryId, newDepartureDate) {
  const body = {
    changes: [{ itineraryId: itineraryId || 'ITIN-1', newDepartureDate }]
  };
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/date-change/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Error al buscar cambios de fecha');
  return await res.json();
}

export async function confirmDateChange(bookingId, changeOfferId) {
  const body = {
    changeOfferId,
    payment: { paymentReferenceValue: 'CHG-PAY-' + Math.random().toString(36).substring(2, 7).toUpperCase() }
  };
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/date-change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Error al confirmar cambio de fecha');
  return await res.json();
}

export async function getCancellationQuote(bookingId) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancellation-quote`);
  if (!res.ok) throw new Error('Error al cotizar cancelación');
  return await res.json();
}

export async function cancelBooking(bookingId, quoteId, reason) {
  const body = { quoteId, reason: reason || 'Cancelado por el usuario' };
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Error al cancelar la reserva');
  return await res.json();
}

export async function getFlightStatus(flightNumber, date) {
  const queryDate = date || new Date().toISOString().split('T')[0];
  const res = await fetch(`${API_BASE}/flights/${encodeURIComponent(flightNumber)}/status?date=${queryDate}`);
  if (!res.ok) throw new Error(`Estado de vuelo no disponible para ${flightNumber}`);
  return await res.json();
}

export async function adminLogin(email, password) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Credenciales de administrador incorrectas');
  }
  return await res.json();
}

export async function getAdminDashboardStats() {
  const res = await fetch(`${API_BASE}/admin/dashboard-stats`);
  if (!res.ok) throw new Error('Error al obtener estadísticas del dashboard');
  return await res.json();
}

export async function updateFlightStatus(flightNumber, status) {
  const res = await fetch(`${API_BASE}/admin/flights/${encodeURIComponent(flightNumber)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error al actualizar estado del vuelo');
  }
  return await res.json();
}

export async function getFlightPassengers(flightNumber) {
  const res = await fetch(`${API_BASE}/admin/flights/${encodeURIComponent(flightNumber)}/passengers`);
  if (!res.ok) throw new Error('Error al obtener pasajeros del vuelo');
  return await res.json();
}

export async function changeSeat(bookingId, newSeatNumber, passengerId) {
  const body = { newSeatNumber, passengerId };
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/seat`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.title || 'Error al cambiar asiento');
  }
  return await res.json();
}
