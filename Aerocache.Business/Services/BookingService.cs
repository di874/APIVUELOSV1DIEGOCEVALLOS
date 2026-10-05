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

        public BookingService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<BookingDetail> CreateBookingAsync(BookingRequest request, string? idempotencyKey)
        {
            if (!Guid.TryParse(request.HoldId, out var holdId))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "HoldId inválido");
            }

            var hold = await _uow.Holds.GetByIdAsync(holdId);
            if (hold == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Hold no encontrado");
            }

            if (hold.Status == "EXPIRED" || hold.ExpiresAt < DateTime.UtcNow)
            {
                throw new AerocacheProblemException(410, "QUOTE_EXPIRED", "El tiempo de bloqueo de tarifa (Hold) ha expirado.");
            }

            if (hold.Status == "CONSUMED")
            {
                throw new AerocacheProblemException(409, "ALREADY_CANCELLED", "Este Hold ya ha sido utilizado para otra reserva.");
            }

            if (string.IsNullOrWhiteSpace(request.Payment?.PaymentReferenceValue))
            {
                throw new AerocacheProblemException(400, "PAYMENT_REFERENCE_INVALID", "Referencia de pago inválida o no provista");
            }

            var flight = await _uow.Flights.GetByIdAsync(hold.FlightId);
            if (flight == null)
            {
                throw new AerocacheProblemException(404, "OFFER_NO_LONGER_AVAILABLE", "Vuelo asociado no encontrado");
            }

            // Generate realistic 6-character PNR (Latin American airline standard)
            string pnr = "AC" + new Random().Next(1000, 9999).ToString() + "X";

            var booking = new Booking
            {
                BookingId = Guid.NewGuid(),
                Pnr = pnr,
                Status = "CONFIRMED",
                GrandTotalBase = hold.LockedBaseFare,
                GrandTotalTaxes = hold.LockedTaxes,
                GrandTotalAmount = hold.LockedTotal,
                Currency = hold.Currency,
                CreatedAt = DateTime.UtcNow,
                PaymentReference = request.Payment.PaymentReferenceValue,
                FlightId = flight.Id,
                ItineraryId = hold.ItineraryId,
                CabinClass = hold.CabinClass,
                FareBrand = hold.FareBrand,
                OriginIata = flight.OriginIata,
                DestinationIata = flight.DestinationIata,
                DepartureDate = flight.ScheduledDeparture
            };

            var occupiedSeats = await _uow.Bookings.Query()
                .Where(b => b.FlightId == flight.Id && (b.Status == "CONFIRMED" || b.Status == "CHECKED_IN"))
                .SelectMany(b => b.Passengers.Select(pax => pax.AssignedSeatNumber))
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

                var passenger = new Passenger
                {
                    BookingId = booking.BookingId,
                    PassengerType = p.PassengerType ?? "ADULT",
                    AssociatedAdultId = p.AssociatedAdultId,
                    FirstName = p.FirstName,
                    LastName = p.LastName,
                    DocumentType = p.DocumentType ?? "NATIONAL_ID",
                    DocumentNumber = p.DocumentNumber,
                    Nationality = p.Nationality ?? "EC",
                    DocumentExpiryDate = p.DocumentExpiryDate,
                    BirthDate = p.BirthDate,
                    Gender = p.Gender ?? "M",
                    Email = p.Contact?.Email ?? "",
                    Phone = p.Contact?.Phone ?? "",
                    AssignedSeatNumber = requestedSeat,
                    ExtraBaggageQuantity = p.ExtraBaggage?.Sum(b => b.Quantity) ?? 0
                };
                booking.Passengers.Add(passenger);

                // Create e-ticket immediately
                var ticket = new Ticket
                {
                    BookingId = booking.BookingId,
                    PassengerId = passenger.Id,
                    ETicketNumber = "045-" + new Random().Next(100000000, 999999999).ToString(),
                    Status = "ISSUED",
                    IssuedAt = DateTime.UtcNow,
                    SegmentId = $"SEG-{flight.Id}",
                    CouponNumber = "CP-1"
                };
                booking.Tickets.Add(ticket);
            }

            hold.Status = "CONSUMED";

            await _uow.Bookings.AddAsync(booking);
            await _uow.CompleteAsync();

            return await GetBookingDetailAsync(booking.BookingId.ToString());
        }

        public async Task<BookingDetail> GetBookingDetailAsync(string bookingId)
        {
            if (!Guid.TryParse(bookingId, out var id))
            {
                throw new AerocacheProblemException(400, "VALIDATION_FAILED", "BookingId inválido");
            }

            var booking = await _uow.Bookings.Query()
                .Include(b => b.Passengers)
                .Include(b => b.Tickets)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
            {
                throw new AerocacheProblemException(404, "BOOKING_NOT_CONFIRMED", "Reserva no encontrada");
            }

            var flight = await _uow.Flights.GetByIdAsync(booking.FlightId ?? "");

            var segment = new FlightSegmentDto
            {
                SegmentId = $"SEG-{flight?.Id ?? "0"}",
                FlightNumber = flight?.FlightNumber ?? "AC1401",
                MarketingCarrier = "AC",
                OperatingCarrier = "AC",
                Aircraft = flight?.Aircraft ?? "Airbus A320",
                DurationMinutes = flight?.DurationMinutes ?? 50,
                Status = flight?.Status ?? "SCHEDULED",
                Departure = new FlightEndpoint
                {
                    IataCode = booking.OriginIata,
                    At = booking.DepartureDate.ToString("o"),
                    Terminal = "T1"
                },
                Arrival = new FlightEndpoint
                {
                    IataCode = booking.DestinationIata,
                    At = booking.DepartureDate.AddMinutes(flight?.DurationMinutes ?? 50).ToString("o"),
                    Terminal = "T1"
                }
            };

            return new BookingDetail
            {
                BookingId = booking.BookingId.ToString(),
                Pnr = booking.Pnr,
                Status = booking.Status,
                CreatedAt = booking.CreatedAt.ToString("o"),
                UpdatedAt = booking.UpdatedAt?.ToString("o"),
                GrandTotal = new MoneyAmount
                {
                    Currency = booking.Currency,
                    BaseFare = booking.GrandTotalBase.ToString("F2", CultureInfo.InvariantCulture),
                    Taxes = booking.GrandTotalTaxes.ToString("F2", CultureInfo.InvariantCulture),
                    Total = booking.GrandTotalAmount.ToString("F2", CultureInfo.InvariantCulture)
                },
                Itineraries = new List<ItineraryOptionDto>
                {
                    new()
                    {
                        ItineraryId = booking.ItineraryId ?? "ITIN-1",
                        TotalDurationMinutes = flight?.DurationMinutes ?? 50,
                        StopsCount = 0,
                        Segments = new List<FlightSegmentDto> { segment }
                    }
                },
                Passengers = booking.Passengers.Select(p => new PassengerItem
                {
                    PassengerId = p.Id,
                    PassengerType = p.PassengerType,
                    FirstName = p.FirstName,
                    LastName = p.LastName,
                    DocumentType = p.DocumentType,
                    DocumentNumber = p.DocumentNumber,
                    Nationality = p.Nationality,
                    BirthDate = p.BirthDate,
                    Gender = p.Gender,
                    Contact = new ContactInfo { Email = p.Email, Phone = p.Phone },
                    AssignedSeats = new List<AssignedSeatDto>
                    {
                        new() { SegmentId = $"SEG-{flight?.Id ?? "0"}", SeatNumber = p.AssignedSeatNumber ?? "12A" }
                    }
                }).ToList(),
                Tickets = booking.Tickets.Select(t => new TicketDto
                {
                    TicketId = t.TicketId,
                    BookingId = t.BookingId.ToString(),
                    PassengerId = t.PassengerId,
                    ETicketNumber = t.ETicketNumber,
                    Status = t.Status,
                    IssuedAt = t.IssuedAt.ToString("o"),
                    Segments = new List<TicketSegmentDto>
                    {
                        new() { SegmentId = t.SegmentId, Status = t.Status, CouponNumber = t.CouponNumber }
                    }
                }).ToList(),
                Changes = string.IsNullOrWhiteSpace(booking.ChangesHistoryJson)
                    ? new List<ChangeHistoryItem>()
                    : new List<ChangeHistoryItem> { new() { ChangedAt = booking.UpdatedAt?.ToString("o"), Description = booking.ChangesHistoryJson } }
            };
        }

        public async Task<BookingListResponse> ListBookingsAsync(string? pnr, string? status, string? createdFrom, string? createdTo, int limit, string? cursor)
        {
            var query = _uow.Bookings.Query().AsQueryable();

            if (!string.IsNullOrWhiteSpace(pnr))
                query = query.Where(b => b.Pnr == pnr);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(b => b.Status == status);

            var list = await query.OrderByDescending(b => b.CreatedAt).Take(Math.Min(limit, 50)).ToListAsync();

            return new BookingListResponse
            {
                NextCursor = null,
                Items = list.Select(b => new BookingSummaryItem
                {
                    BookingId = b.BookingId.ToString(),
                    Pnr = b.Pnr,
                    Status = b.Status,
                    Origin = b.OriginIata,
                    Destination = b.DestinationIata,
                    DepartureDate = b.DepartureDate.ToString("yyyy-MM-dd"),
                    GrandTotal = new MoneyAmount
                    {
                        Currency = b.Currency,
                        Total = b.GrandTotalAmount.ToString("F2", CultureInfo.InvariantCulture)
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

            var tickets = await _uow.Tickets.FindAsync(t => t.BookingId == id);
            return new TicketListResponse
            {
                BookingId = bookingId,
                Tickets = tickets.Select(t => new TicketDto
                {
                    TicketId = t.TicketId,
                    BookingId = t.BookingId.ToString(),
                    PassengerId = t.PassengerId,
                    ETicketNumber = t.ETicketNumber,
                    Status = t.Status,
                    IssuedAt = t.IssuedAt.ToString("o"),
                    Segments = new List<TicketSegmentDto>
                    {
                        new() { SegmentId = t.SegmentId, Status = t.Status, CouponNumber = t.CouponNumber }
                    }
                }).ToList()
            };
        }

        public async Task<TicketDto> GetTicketAsync(string bookingId, string ticketId)
        {
            var ticket = await _uow.Tickets.FirstOrDefaultAsync(t => t.TicketId == ticketId);
            if (ticket == null)
            {
                throw new AerocacheProblemException(404, "TICKET_ISSUANCE_FAILED", "Ticket no encontrado");
            }

            return new TicketDto
            {
                TicketId = ticket.TicketId,
                BookingId = ticket.BookingId.ToString(),
                PassengerId = ticket.PassengerId,
                ETicketNumber = ticket.ETicketNumber,
                Status = ticket.Status,
                IssuedAt = ticket.IssuedAt.ToString("o"),
                Segments = new List<TicketSegmentDto>
                {
                    new() { SegmentId = ticket.SegmentId, Status = ticket.Status, CouponNumber = ticket.CouponNumber }
                }
            };
        }
    }
}
