using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Aerocache.Business.DTOs;
using Aerocache.Business.Exceptions;
using Aerocache.Business.Interfaces;
using Aerocache.DataAccess.Entities;
using Aerocache.DataManagement.Interfaces;

namespace Aerocache.Business.Services
{
    public class BookingService : IBookingService
    {
        private readonly IUnitOfWork _uow;
        private readonly IEventBus? _eventBus;

        public BookingService(IUnitOfWork uow, IEventBus? eventBus = null)
        {
            _uow = uow;
            _eventBus = eventBus;
        }

        public async Task<BookingDetail> CreateBookingAsync(BookingRequest request, string? idempotencyKey)
        {
            if (!Guid.TryParse(request.HoldId, out var holdId))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "HoldId inválido");
            }

            var hold = await _uow.BloqueosTemporales.GetByIdAsync(holdId);
            if (hold == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Hold no encontrado");
            }

            if (hold.Estado == "EXPIRED" || hold.FechaExpiracion < DateTime.UtcNow)
            {
                throw new AerocacheProblemException(410, "QUOTE_EXPIRED", "El tiempo de bloqueo de tarifa (Hold) ha expirado.");
            }

            if (hold.Estado == "CONSUMED")
            {
                throw new AerocacheProblemException(409, "ALREADY_CANCELLED", "Este Hold ya ha sido utilizado para otra reserva.");
            }

            if (string.IsNullOrWhiteSpace(request.Payment?.PaymentReferenceValue))
            {
                throw new AerocacheProblemException(400, "PAYMENT_REFERENCE_INVALID", "Referencia de pago inválida o no provista");
            }

            var flight = await _uow.Vuelos.GetByIdAsync(hold.VueloId);
            if (flight == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Vuelo asociado no encontrado");
            }

            // Generate realistic 6-character PNR (Latin American airline standard)
            string pnr = "AC" + new Random().Next(1000, 9999).ToString() + "X";

            var booking = new Reserva
            {
                ReservaId = Guid.NewGuid(),
                Pnr = pnr,
                Estado = "CONFIRMED",
                TotalBaseGeneral = hold.TarifaBaseBloqueada,
                TotalImpuestosGeneral = hold.ImpuestosBloqueados,
                MontoTotalGeneral = hold.TotalBloqueado,
                Moneda = hold.Moneda,
                FechaCreacion = DateTime.UtcNow,
                ReferenciaPago = request.Payment.PaymentReferenceValue,
                VueloId = flight.Id,
                ItinerarioId = hold.ItinerarioId,
                ClaseCabina = hold.ClaseCabina,
                MarcaTarifa = hold.MarcaTarifa,
                OrigenIata = flight.OrigenIata,
                DestinoIata = flight.DestinoIata,
                FechaSalida = flight.SalidaProgramada
            };

            var occupiedSeats = await _uow.Reservas.Query()
                .Where(b => b.VueloId == flight.Id && (b.Estado == "CONFIRMED" || b.Estado == "CHECKED_IN"))
                .SelectMany(b => b.Pasajeros.Select(pax => pax.NumeroAsientoAsignado))
                .Where(s => !string.IsNullOrEmpty(s))
                .ToListAsync();

            var occupiedSeatSet = new HashSet<string>(occupiedSeats.Where(s => !string.IsNullOrEmpty(s))!, StringComparer.OrdinalIgnoreCase);

            foreach (var p in request.Passengers)
            {
                var requestedSeat = p.AssignedSeats?.FirstOrDefault()?.SeatNumber?.Trim().ToUpperInvariant();

                if (!string.IsNullOrEmpty(requestedSeat))
                {
                    if (occupiedSeatSet.Contains(requestedSeat))
                    {
                        throw new AerocacheProblemException(409, "SEAT_NOT_AVAILABLE", "Asiento no disponible", 
                            $"El asiento {requestedSeat} ya ha sido reservado por otro cliente en este vuelo. Por favor seleccione otro asiento.");
                    }
                }
                else
                {
                    for (int r = 4; r <= 24; r++)
                    {
                        foreach (var col in new[] { "A", "B", "C", "D", "E", "F" })
                        {
                            var candidate = $"{r}{col}";
                            if (!occupiedSeatSet.Contains(candidate))
                            {
                                requestedSeat = candidate;
                                break;
                            }
                        }
                        if (!string.IsNullOrEmpty(requestedSeat)) break;
                    }
                    if (string.IsNullOrEmpty(requestedSeat)) requestedSeat = "14A";
                }

                occupiedSeatSet.Add(requestedSeat);

                var passenger = new Pasajero
                {
                    ReservaId = booking.ReservaId,
                    TipoPasajero = p.PassengerType ?? "ADULT",
                    AdultoAsociadoId = p.AssociatedAdultId,
                    Nombre = p.FirstName,
                    Apellido = p.LastName,
                    TipoDocumento = p.DocumentType ?? "NATIONAL_ID",
                    NumeroDocumento = p.DocumentNumber,
                    Nacionalidad = p.Nationality ?? "EC",
                    FechaCaducidadDocumento = p.DocumentExpiryDate,
                    FechaNacimiento = p.BirthDate,
                    Genero = p.Gender ?? "M",
                    Correo = p.Contact?.Email ?? "",
                    Telefono = p.Contact?.Phone ?? "",
                    NumeroAsientoAsignado = requestedSeat,
                    CantidadEquipajeExtra = p.ExtraBaggage?.Sum(b => b.Quantity) ?? 0
                };
                booking.Pasajeros.Add(passenger);

                // Create e-ticket immediately
                var ticket = new Boleto
                {
                    ReservaId = booking.ReservaId,
                    PasajeroId = passenger.Id,
                    NumeroBoletoElectronico = "045-" + new Random().Next(100000000, 999999999).ToString(),
                    Estado = "ISSUED",
                    FechaEmision = DateTime.UtcNow,
                    SegmentoId = $"SEG-{flight.Id}",
                    NumeroCupon = "CP-1"
                };
                booking.Boletos.Add(ticket);
            }

            hold.Estado = "CONSUMED";

            await _uow.Reservas.AddAsync(booking);
            await _uow.CompleteAsync();

            if (_eventBus != null)
            {
                await _eventBus.PublishAsync("booking.confirmed", new
                {
                    bookingId = booking.ReservaId,
                    pnr = booking.Pnr,
                    status = booking.Estado,
                    vueloId = booking.VueloId,
                    total = booking.MontoTotalGeneral,
                    currency = booking.Moneda,
                    passengersCount = booking.Pasajeros.Count,
                    createdAt = booking.FechaCreacion
                });
            }

            return await GetBookingDetailAsync(booking.ReservaId.ToString());
        }

        public async Task<BookingDetail> GetBookingDetailAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");
            }

            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .Include(b => b.Boletos)
                .FirstOrDefaultAsync(b => b.ReservaId == id);

            if (booking == null)
            {
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");
            }

            var flight = await _uow.Vuelos.GetByIdAsync(booking.VueloId ?? "");

            var segment = new FlightSegmentDto
            {
                SegmentId = $"SEG-{flight?.Id ?? "0"}",
                FlightNumber = flight?.NumeroVuelo ?? "AC1401",
                MarketingCarrier = "AC",
                OperatingCarrier = "AC",
                Aircraft = flight?.Aeronave ?? "Airbus A320",
                DurationMinutes = flight?.DuracionMinutos ?? 50,
                Status = flight?.Estado ?? "SCHEDULED",
                Departure = new FlightEndpoint
                {
                    IataCode = booking.OrigenIata,
                    At = booking.FechaSalida.ToString("o"),
                    Terminal = "T1"
                },
                Arrival = new FlightEndpoint
                {
                    IataCode = booking.DestinoIata,
                    At = booking.FechaSalida.AddMinutes(flight?.DuracionMinutos ?? 50).ToString("o"),
                    Terminal = "T1"
                }
            };

            return new BookingDetail
            {
                BookingId = booking.ReservaId.ToString(),
                Pnr = booking.Pnr,
                Status = booking.Estado,
                CreatedAt = booking.FechaCreacion.ToString("o"),
                UpdatedAt = booking.FechaActualizacion?.ToString("o"),
                GrandTotal = new MoneyAmount
                {
                    Currency = booking.Moneda,
                    BaseFare = booking.TotalBaseGeneral.ToString("F2", CultureInfo.InvariantCulture),
                    Taxes = booking.TotalImpuestosGeneral.ToString("F2", CultureInfo.InvariantCulture),
                    Total = booking.MontoTotalGeneral.ToString("F2", CultureInfo.InvariantCulture)
                },
                Itineraries = new List<ItineraryOptionDto>
                {
                    new()
                    {
                        ItineraryId = booking.ItinerarioId ?? "ITIN-1",
                        TotalDurationMinutes = flight?.DuracionMinutos ?? 50,
                        StopsCount = 0,
                        Segments = new List<FlightSegmentDto> { segment }
                    }
                },
                Passengers = booking.Pasajeros.Select(p => new PassengerItem
                {
                    PassengerId = p.Id,
                    PassengerType = p.TipoPasajero,
                    FirstName = p.Nombre,
                    LastName = p.Apellido,
                    DocumentType = p.TipoDocumento,
                    DocumentNumber = p.NumeroDocumento,
                    Nationality = p.Nacionalidad,
                    BirthDate = p.FechaNacimiento,
                    Gender = p.Genero,
                    Contact = new ContactInfo { Email = p.Correo, Phone = p.Telefono },
                    AssignedSeats = new List<AssignedSeatDto>
                    {
                        new() { SegmentId = $"SEG-{flight?.Id ?? "0"}", SeatNumber = p.NumeroAsientoAsignado ?? "12A" }
                    }
                }).ToList(),
                Tickets = booking.Boletos.Select(t => new TicketDto
                {
                    TicketId = t.BoletoId,
                    BookingId = t.ReservaId.ToString(),
                    PassengerId = t.PasajeroId,
                    ETicketNumber = t.NumeroBoletoElectronico,
                    Status = t.Estado,
                    IssuedAt = t.FechaEmision.ToString("o"),
                    Segments = new List<TicketSegmentDto>
                    {
                        new() { SegmentId = t.SegmentoId, Status = t.Estado, CouponNumber = t.NumeroCupon }
                    }
                }).ToList(),
                Changes = string.IsNullOrWhiteSpace(booking.HistorialCambiosJson)
                    ? new List<ChangeHistoryItem>()
                    : new List<ChangeHistoryItem> { new() { ChangedAt = booking.FechaActualizacion?.ToString("o"), Description = booking.HistorialCambiosJson } }
            };
        }

        public async Task<BookingListResponse> ListBookingsAsync(string? pnr, string? status, string? createdFrom, string? createdTo, int limit, string? cursor)
        {
            var query = _uow.Reservas.Query().AsQueryable();

            if (!string.IsNullOrWhiteSpace(pnr))
                query = query.Where(b => b.Pnr == pnr);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(b => b.Estado == status);

            var list = await query.OrderByDescending(b => b.FechaCreacion).Take(Math.Min(limit, 50)).ToListAsync();

            return new BookingListResponse
            {
                NextCursor = null,
                Items = list.Select(b => new BookingSummaryItem
                {
                    BookingId = b.ReservaId.ToString(),
                    Pnr = b.Pnr,
                    Status = b.Estado,
                    Origin = b.OrigenIata,
                    Destination = b.DestinoIata,
                    DepartureDate = b.FechaSalida.ToString("yyyy-MM-dd"),
                    GrandTotal = new MoneyAmount
                    {
                        Currency = b.Moneda,
                        Total = b.MontoTotalGeneral.ToString("F2", CultureInfo.InvariantCulture)
                    }
                }).ToList()
            };
        }

        public async Task<TicketListResponse> GetBookingTicketsAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");
            }

            var tickets = await _uow.Boletos.FindAsync(t => t.ReservaId == id);
            return new TicketListResponse
            {
                BookingId = bookingId,
                Tickets = tickets.Select(t => new TicketDto
                {
                    TicketId = t.BoletoId,
                    BookingId = t.ReservaId.ToString(),
                    PassengerId = t.PasajeroId,
                    ETicketNumber = t.NumeroBoletoElectronico,
                    Status = t.Estado,
                    IssuedAt = t.FechaEmision.ToString("o"),
                    Segments = new List<TicketSegmentDto>
                    {
                        new() { SegmentId = t.SegmentoId, Status = t.Estado, CouponNumber = t.NumeroCupon }
                    }
                }).ToList()
            };
        }

        public async Task<TicketDto> GetTicketAsync(string bookingId, string ticketId)
        {
            var ticket = await _uow.Boletos.FirstOrDefaultAsync(t => t.BoletoId == ticketId);
            if (ticket == null)
            {
                throw new AerocacheProblemException(404, "TICKET_ISSUANCE_FAILED", "Ticket no encontrado");
            }

            return new TicketDto
            {
                TicketId = ticket.BoletoId,
                BookingId = ticket.ReservaId.ToString(),
                PassengerId = ticket.PasajeroId,
                ETicketNumber = ticket.NumeroBoletoElectronico,
                Status = ticket.Estado,
                IssuedAt = ticket.FechaEmision.ToString("o"),
                Segments = new List<TicketSegmentDto>
                {
                    new() { SegmentId = ticket.SegmentoId, Status = ticket.Estado, CouponNumber = ticket.NumeroCupon }
                }
            };
        }

        public async Task<TicketIssuanceResponse> IssueTicketsAsync(string bookingId, string? idempotencyKey)
        {
            var isGuid = Guid.TryParse(bookingId, out var id);
            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .Include(b => b.Boletos)
                .FirstOrDefaultAsync(b => (isGuid && b.ReservaId == id) || b.Pnr == bookingId);

            if (booking == null)
            {
                throw new AerocacheProblemException(404, "BOOKING_NOT_FOUND", "Reserva no encontrada");
            }

            int issuedCount = 0;
            foreach (var p in booking.Pasajeros)
            {
                var existingTicket = booking.Boletos.FirstOrDefault(t => t.PasajeroId == p.Id);
                if (existingTicket == null)
                {
                    var ticket = new Boleto
                    {
                        ReservaId = booking.ReservaId,
                        PasajeroId = p.Id,
                        NumeroBoletoElectronico = "045-" + new Random().Next(100000000, 999999999).ToString(),
                        Estado = "ISSUED",
                        FechaEmision = DateTime.UtcNow,
                        SegmentoId = "SEG-" + (booking.VueloId ?? "UIO-GYE"),
                        NumeroCupon = "CP-1"
                    };
                    await _uow.Boletos.AddAsync(ticket);
                    booking.Boletos.Add(ticket);
                    issuedCount++;
                }
                else if (existingTicket.Estado != "ISSUED")
                {
                    existingTicket.Estado = "ISSUED";
                    existingTicket.FechaEmision = DateTime.UtcNow;
                    issuedCount++;
                }
            }

            booking.Estado = "CONFIRMED";
            booking.FechaActualizacion = DateTime.UtcNow;
            await _uow.CompleteAsync();

            if (_eventBus != null)
            {
                await _eventBus.PublishAsync("ec.edu.epn.booking.vuelos.ticket.issued", new
                {
                    bookingId = booking.ReservaId.ToString(),
                    pnr = booking.Pnr,
                    issuedTickets = issuedCount,
                    timestamp = DateTime.UtcNow
                });
            }

            return new TicketIssuanceResponse
            {
                BookingId = booking.ReservaId.ToString(),
                Pnr = booking.Pnr,
                Status = booking.Estado,
                Issued = issuedCount,
                Tickets = booking.Boletos.Select(t => new TicketDto
                {
                    TicketId = t.BoletoId,
                    BookingId = t.ReservaId.ToString(),
                    PassengerId = t.PasajeroId,
                    ETicketNumber = t.NumeroBoletoElectronico,
                    Status = t.Estado,
                    IssuedAt = t.FechaEmision.ToString("o"),
                    Segments = new List<TicketSegmentDto>
                    {
                        new() { SegmentId = t.SegmentoId, Status = t.Estado, CouponNumber = t.NumeroCupon }
                    }
                }).ToList(),
                _Links = new Dictionary<string, LinkDto>
                {
                    ["self"] = new LinkDto { Href = $"/vuelos/bookings/{booking.ReservaId}/tickets" },
                    ["booking"] = new LinkDto { Href = $"/vuelos/bookings/{booking.ReservaId}" }
                }
            };
        }

        public async Task<SeatChangeResponse> ChangeSeatsV2Async(string bookingId, SeatChangeRequest request, string? idempotencyKey)
        {
            var isGuid = Guid.TryParse(bookingId, out var id);
            var booking = await _uow.Reservas.Query()
                .Include(b => b.Pasajeros)
                .FirstOrDefaultAsync(b => (isGuid && b.ReservaId == id) || b.Pnr == bookingId);

            if (booking == null)
            {
                throw new AerocacheProblemException(404, "BOOKING_NOT_FOUND", "Reserva no encontrada");
            }

            if (request.Seats == null || !request.Seats.Any())
            {
                throw new AerocacheProblemException(400, "INVALID_SEAT_REQUEST", "Debe proporcionar al menos un asiento a asignar.");
            }

            var responseItems = new List<SeatChangeItemResponse>();

            foreach (var seatReq in request.Seats)
            {
                var passenger = booking.Pasajeros.FirstOrDefault(p => p.Id == seatReq.PassengerId)
                                ?? booking.Pasajeros.FirstOrDefault();

                if (passenger == null) continue;

                var prev = passenger.NumeroAsientoAsignado;
                passenger.NumeroAsientoAsignado = seatReq.SeatNumber.Trim().ToUpperInvariant();

                responseItems.Add(new SeatChangeItemResponse
                {
                    PassengerId = passenger.Id,
                    SegmentId = seatReq.SegmentId ?? $"SEG-{booking.VueloId}",
                    PreviousSeatNumber = prev,
                    SeatNumber = passenger.NumeroAsientoAsignado,
                    Status = "CONFIRMED"
                });
            }

            booking.FechaActualizacion = DateTime.UtcNow;
            await _uow.CompleteAsync();

            if (_eventBus != null)
            {
                await _eventBus.PublishAsync("ec.edu.epn.booking.vuelos.booking.changed", new
                {
                    bookingId = booking.ReservaId.ToString(),
                    pnr = booking.Pnr,
                    seatsChanged = responseItems.Count,
                    timestamp = DateTime.UtcNow
                });
            }

            return new SeatChangeResponse
            {
                BookingId = booking.ReservaId.ToString(),
                Seats = responseItems,
                AmountCharged = new MoneyAmount { Currency = booking.Moneda ?? "USD", Total = "0.00" },
                _Links = new Dictionary<string, LinkDto>
                {
                    ["self"] = new LinkDto { Href = $"/vuelos/bookings/{booking.ReservaId}/seats" },
                    ["booking"] = new LinkDto { Href = $"/vuelos/bookings/{booking.ReservaId}" }
                }
            };
        }
    }
}
